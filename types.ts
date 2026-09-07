/**
 * Hand-written stand-in for the generated Supabase types. Once the schema
 * is applied to a real project, replace this file's `Database` export with
 * the output of:
 *
 *   npx supabase gen types typescript --project-id <your-project-ref> > lib/database.types.ts
 *
 * and re-point the imports in lib/supabase/client.ts and server.ts. Kept
 * intentionally loose here so the rest of the app has something to compile
 * against before that step.
 */
export type Database = Record<string, unknown>;

export type MasteryState = "new" | "learning" | "strong" | "mastered" | "at_risk";

export interface Concept {
  id: string;
  user_id: string;
  course_id: string | null;
  material_id: string | null;
  title: string;
  slug: string;
  created_at: string;
}

export interface Lesson {
  id: string;
  concept_id: string;
  what_is_it: string;
  simple_explanation: string;
  academic_explanation: string;
  exam_explanation: string;
  key_elements: string[];
  why_matters: string | null;
  source_status: "supported" | "conflicting" | "needs_context" | null;
  source_lecture: string | null;
  source_external: string | null;
}

export interface RelatedConcept {
  id: string;
  concept_id: string;
  related_title: string;
  kind: "related" | "prerequisite" | "deeper";
}

export interface Course {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface Material {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  file_path: string;
  file_type: string;
  status: "uploaded" | "extracting" | "analyzing" | "structuring" | "ready" | "failed";
  error_message: string | null;
  created_at: string;
}

export interface Mastery {
  concept_id: string;
  state: MasteryState;
  correct_streak: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
}
