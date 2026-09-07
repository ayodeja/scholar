import "server-only";
import { extractTextFromImage } from "@/lib/gemini";

export type SupportedFileKind = "txt" | "pdf" | "image" | "doc" | "audio" | "video";

export function classifyFile(fileName: string, mimeType: string): SupportedFileKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) return "pdf";
  if (fileName.endsWith(".doc") || fileName.endsWith(".docx")) return "doc";
  return "txt";
}

/**
 * Extracts plain text from a downloaded file buffer so it can be handed to
 * Gemini for lesson generation.
 *
 * Honesty note (spec §45, "no false AI"): audio and video transcription is
 * NOT implemented in this v1 — it needs a dedicated speech-to-text service
 * (e.g. Gemini's audio understanding endpoint, or a Whisper-based pipeline)
 * that is straightforward to add here later. Rather than pretend to
 * transcribe them, this throws a clear, typed error so the UI can show an
 * honest "not supported yet" state instead of fabricated content.
 */
export async function extractText(kind: SupportedFileKind, buffer: Buffer, mimeType: string): Promise<string> {
  switch (kind) {
    case "txt":
      return buffer.toString("utf-8");
    case "pdf": {
      // Lazy import — keeps this dependency out of the client bundle entirely.
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      return result.text;
    }
    case "image":
      return extractTextFromImage(buffer.toString("base64"), mimeType);
    case "doc":
      throw new UnsupportedFileError(
        "DOC/DOCX extraction isn't wired up yet — export the file as PDF or plain text for now."
      );
    case "audio":
    case "video":
      throw new UnsupportedFileError(
        `${kind === "audio" ? "Audio" : "Video"} transcription isn't implemented yet. This needs a speech-to-text step before Scholar can build a lesson from it.`
      );
  }
}

export class UnsupportedFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFileError";
  }
}
