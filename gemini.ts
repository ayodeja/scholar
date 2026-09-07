import "server-only";

/**
 * Scholar's single Gemini integration point.
 *
 * This file must only ever be imported from server code (Route Handlers,
 * Server Components, Server Actions). The `server-only` import above makes
 * any accidental client-side import a build-time error. GEMINI_API_KEY is
 * read from process.env and never sent to the browser.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const API_KEY = process.env.GEMINI_API_KEY;
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

export class GeminiError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "GeminiError";
  }
}

type CallOptions = {
  json?: boolean;
  grounding?: boolean;
  model?: string;
  temperature?: number;
};

/** The one function every AI feature routes through. */
async function callGemini(prompt: string, opts: CallOptions = {}): Promise<string> {
  if (!API_KEY) {
    // Fail loudly server-side; callers decide how to degrade the UI.
    throw new GeminiError("GEMINI_API_KEY is not configured");
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: opts.temperature ?? 0.4 },
  };
  if (opts.json) {
    (body.generationConfig as Record<string, unknown>).responseMimeType = "application/json";
  }
  if (opts.grounding) {
    body.tools = [{ google_search: {} }];
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT(opts.model || GEMINI_MODEL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Server-side calls should not hang forever and block a request.
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new GeminiError("Gemini request failed to send", err);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GeminiError(`Gemini responded ${res.status}`, text);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ?? "";
  if (!text) throw new GeminiError("Gemini returned an empty response");
  return text;
}

/** Parses a JSON response and validates it with the given zod-like check
 * function before returning. Never lets malformed AI output reach storage
 * or the UI silently. */
async function callGeminiJSON<T>(
  prompt: string,
  validate: (v: unknown) => v is T,
  opts: CallOptions = {}
): Promise<T> {
  const raw = await callGemini(prompt, { ...opts, json: true });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new GeminiError("Gemini returned invalid JSON", raw);
  }
  if (!validate(parsed)) {
    throw new GeminiError("Gemini JSON failed validation", parsed);
  }
  return parsed;
}

/* ---------------------------------------------------------------------- */
/* Domain-specific AI functions — every feature calls one of these,       */
/* never callGemini() directly, so prompts stay centralized and testable. */
/* ---------------------------------------------------------------------- */

export interface LessonDraft {
  title: string;
  whatIsIt: string;
  simple: string;
  academic: string;
  exam: string;
  keyElements: string[];
  related: string[];
  before: string[];
  deeper: string[];
  whyMatters: string;
}

function isLessonDraft(v: unknown): v is LessonDraft {
  if (!v || typeof v !== "object") return false;
  const l = v as Record<string, unknown>;
  return (
    typeof l.title === "string" &&
    typeof l.whatIsIt === "string" &&
    typeof l.simple === "string" &&
    typeof l.academic === "string" &&
    typeof l.exam === "string" &&
    Array.isArray(l.keyElements) &&
    Array.isArray(l.related)
  );
}

/** Builds a structured lesson either from a free-text topic (Explore) or
 * from extracted material text (an uploaded file). */
export async function generateLesson(input: { topic?: string; materialText?: string }): Promise<LessonDraft> {
  const source = input.materialText
    ? `the following study material:\n"""${input.materialText.slice(0, 6000)}"""`
    : `the topic: "${input.topic}"`;

  const prompt = `You are Scholar, an academic tutor. Build one structured lesson from ${source}.
Return ONLY JSON matching exactly this shape, no markdown fences, no commentary:
{
  "title": string,
  "whatIsIt": string (2-3 sentences),
  "simple": string (first-encounter explanation, 3-5 sentences),
  "academic": string (precise academic explanation, 3-5 sentences),
  "exam": string (how to answer this in an exam, 3-5 sentences),
  "keyElements": string[] (3-6 items),
  "related": string[] (3-6 related concept names),
  "before": string[] (0-2 prerequisite concept names),
  "deeper": string[] (0-3 concept names to go deeper),
  "whyMatters": string (1-2 sentences)
}`;

  return callGeminiJSON(prompt, isLessonDraft);
}

export interface QuizQuestion {
  type: "mc" | "short";
  question: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  modelAnswer?: string;
}

function isQuizQuestions(v: unknown): v is { questions: QuizQuestion[] } {
  if (!v || typeof v !== "object") return false;
  const q = (v as Record<string, unknown>).questions;
  return Array.isArray(q) && q.length > 0 && q.every((item) => {
    const i = item as Record<string, unknown>;
    return (i.type === "mc" || i.type === "short") && typeof i.question === "string";
  });
}

export async function generateQuiz(lesson: Pick<LessonDraft, "title" | "whatIsIt" | "academic">, count = 5) {
  const prompt = `Create ${count} quiz questions (mix of multiple choice "mc" and short answer "short") testing understanding of "${lesson.title}".
Base material: ${lesson.whatIsIt} ${lesson.academic}
Return ONLY JSON: {"questions": [
  {"type":"mc","question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."},
  {"type":"short","question":"...","modelAnswer":"..."}
]}`;
  const result = await callGeminiJSON(prompt, isQuizQuestions);
  return result.questions;
}

export interface Flashcard {
  front: string;
  back: string;
}
function isFlashcards(v: unknown): v is { cards: Flashcard[] } {
  if (!v || typeof v !== "object") return false;
  const c = (v as Record<string, unknown>).cards;
  return Array.isArray(c) && c.every((item) => {
    const i = item as Record<string, unknown>;
    return typeof i.front === "string" && typeof i.back === "string";
  });
}
export async function generateFlashcards(lesson: Pick<LessonDraft, "title" | "keyElements">, count = 6) {
  const prompt = `Create ${count} flashcards for "${lesson.title}" based on these key elements: ${lesson.keyElements.join("; ")}.
Return ONLY JSON: {"cards":[{"front":"a question","back":"a concise answer"}]}`;
  const result = await callGeminiJSON(prompt, isFlashcards);
  return result.cards;
}

export interface RecallEvaluation {
  correctPoints: string[];
  missingPoints: string[];
  betterAnswer: string;
  scoreOutOf10: number;
}
function isRecallEvaluation(v: unknown): v is RecallEvaluation {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return Array.isArray(r.correctPoints) && Array.isArray(r.missingPoints) && typeof r.betterAnswer === "string";
}
export async function evaluateRecall(question: string, studentAnswer: string, referenceMaterial: string) {
  const prompt = `A student was asked: "${question}"
They answered: "${studentAnswer}"
Reference material: "${referenceMaterial}"
Evaluate their answer. Return ONLY JSON:
{"correctPoints": string[], "missingPoints": string[], "betterAnswer": string, "scoreOutOf10": number}`;
  return callGeminiJSON(prompt, isRecallEvaluation);
}

/** Socratic tutor turn — never dumps the full answer immediately. */
export async function tutorReply(history: { role: "student" | "scholar"; text: string }[]) {
  const transcript = history.slice(-10).map((h) => `${h.role === "student" ? "Student" : "Scholar"}: ${h.text}`).join("\n");
  const prompt = `You are Scholar, a Socratic academic tutor. Ask guiding questions, give hints, and correct misconceptions. Only give the full answer once the student has attempted a response or explicitly asks for it outright. Keep replies to 2-4 sentences.
${transcript}
Scholar:`;
  return callGemini(prompt, { temperature: 0.6 });
}

/** Web-grounded research, used for the source-check feature and Explore.
 * Returns plain text; caller is responsible for clearly labeling this as
 * external/AI-synthesized versus the student's own material. */
export async function researchTopic(topic: string): Promise<string | null> {
  try {
    return await callGemini(
      `Research "${topic}" using web search grounding. Summarize 2-3 key facts a student should know, and note whether sources broadly agree or disagree. Be concise.`,
      { grounding: true }
    );
  } catch (err) {
    return null; // caller must degrade gracefully — never fabricate a result
  }
}

export interface ExamFeedback {
  whatYouDidWell: string;
  whatYouMissed: string;
  authoritiesToUse: string[];
  howToImprove: string;
  modelAnswer: string;
}
function isExamFeedback(v: unknown): v is ExamFeedback {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return typeof e.whatYouDidWell === "string" && typeof e.modelAnswer === "string";
}
export async function evaluateExamAnswer(question: string, answer: string, subject: string) {
  const prompt = `Subject: ${subject}. Exam question: "${question}". Student's answer: "${answer}".
Evaluate as an examiner would: knowledge, issue identification, authority, application, structure, conclusion.
Return ONLY JSON: {"whatYouDidWell": string, "whatYouMissed": string, "authoritiesToUse": string[], "howToImprove": string, "modelAnswer": string}`;
  return callGeminiJSON(prompt, isExamFeedback);
}

/** Extracts readable text/content from a photographed page (notes, slides,
 * textbook pages) using Gemini's multimodal input. */
export async function extractTextFromImage(base64Data: string, mimeType: string): Promise<string> {
  if (!API_KEY) throw new GeminiError("GEMINI_API_KEY is not configured");
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: "Transcribe all readable text from this image. If it's handwritten, do your best. Return only the transcribed text, no commentary." },
          { inline_data: { mime_type: mimeType, data: base64Data } },
        ],
      },
    ],
  };
  const res = await fetch(ENDPOINT(GEMINI_MODEL), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new GeminiError(`Gemini vision responded ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ?? "";
}

export interface TextbookIdentification {
  title: string;
  author: string;
  edition: string | null;
  publisher: string | null;
  confidence: "high" | "medium" | "low";
}
function isTextbookId(v: unknown): v is TextbookIdentification {
  if (!v || typeof v !== "object") return false;
  const t = v as Record<string, unknown>;
  return typeof t.title === "string" && typeof t.author === "string";
}
/** Identifies a photographed textbook cover/spine/title page. Never invents
 * an identification with high confidence when the image is ambiguous. */
export async function identifyTextbook(base64Data: string, mimeType: string): Promise<TextbookIdentification> {
  if (!API_KEY) throw new GeminiError("GEMINI_API_KEY is not configured");
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Identify this textbook from the image. Return ONLY JSON: {"title": string, "author": string, "edition": string|null, "publisher": string|null, "confidence": "high"|"medium"|"low"}. Use "low" confidence if the image is unclear or you are guessing.`,
          },
          { inline_data: { mime_type: mimeType, data: base64Data } },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json" },
  };
  const res = await fetch(ENDPOINT(GEMINI_MODEL), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new GeminiError(`Gemini vision responded ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ?? "";
  const parsed = JSON.parse(text);
  if (!isTextbookId(parsed)) throw new GeminiError("Textbook identification failed validation");
  return parsed;
}

export { callGemini as _internalCallGemini };
