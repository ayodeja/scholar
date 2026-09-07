# Scholar — production build

Understand more. Remember better. Learn deeper.

## What changed from the v0.1 prototype (audit summary)

The original prototype (plain HTML/CSS/JS) was a good source of the design
system and product flow, so this rebuild kept the visual language and
port over none of its fake data into production code paths:

- **Removed / never carried over:** the hardcoded Gemini key in client JS,
  all sample courses/lessons/quiz results, the simulated processing
  countdown (replaced with real status transitions written to the
  database), and `localStorage`-only state (replaced with Postgres).
- **Preserved:** the color tokens, Geist/Source Serif 4 typographic split,
  bottom-nav + central "Ask Scholar" pattern, and the Simple/Academic/Exam
  lesson structure — all now driven by real data instead of sample JSON.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS · Supabase (Postgres,
Auth, Storage) · Gemini (server-side only) · Vercel-ready.

## 1. Set up Supabase

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/schema.sql` once — it creates every
   table, enables Row Level Security with owner-only policies, and
   creates the private `materials` storage bucket.
3. Copy your Project URL and anon key from Project Settings → API.

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only —
never prefixed with `NEXT_PUBLIC_`, never imported into anything that
ships to the browser (`lib/gemini.ts` imports the `server-only` package
specifically to make an accidental client import a build error).

**About the key that was shared in chat:** treat it as already public —
rotate it in Google AI Studio before using this in anything real, then
put the new one in `.env.local` (and in Vercel's environment variables
for the deployed app). Never commit `.env.local`.

## 3. Install and run

```
npm install
npm run dev
```

## 4. Deploy

Push to a Git repo, import it in Vercel, and add the same four
environment variables in Project Settings → Environment Variables.
`.env.local` is gitignored on purpose — never commit real secrets.

## What's real vs. what's honestly stubbed

**Fully real, no fake data:**
Auth (sign up/in/out, password reset), onboarding saved to `profiles`,
Home/Library/Progress reading live Supabase queries, upload → Storage →
text extraction (TXT, PDF, images) → Gemini lesson generation → saved
lessons/quizzes/flashcards, quiz-taking with attempts recorded, flashcard
review, evidence-based mastery (`lib/mastery.ts`) driving Smart Review,
streaks computed from real `study_sessions` rows, the Socratic tutor
chat persisted to `tutor_sessions`.

**Deliberately not implemented yet — the UI says so rather than faking it:**
- DOC/DOCX, audio, and video material processing (`lib/materials.ts`
  throws a clear "not implemented yet" error instead of pretending to
  transcribe them — audio/video need a speech-to-text step, e.g. a
  dedicated transcription API).
- Exam Mode and Study Pack generation pages (the Gemini functions
  `evaluateExamAnswer` and the study-pack shape exist in `lib/gemini.ts`
  and the schema has `exam_attempts`/`study_packs` tables — no page UI
  yet).
- Textbook photo identification page (`identifyTextbook()` in
  `lib/gemini.ts` is ready; no upload UI wired to it yet).
- Source-check (lecture vs. external research) isn't auto-populated
  during lesson generation yet — the schema and the Learn page both
  support it (`lessons.source_status` etc.), it just needs a call to
  `researchTopic()` wired into the generation route.

## Known limits of this pass

- No automated tests yet (spec §50's manual test list is a good starting
  checklist).
- No rate limiting / cost caps on Gemini calls beyond "reuse saved
  results before regenerating" — worth adding before real classmates hit
  it at scale.
- Icons/PWA assets are a single SVG mark, not a full icon set.
