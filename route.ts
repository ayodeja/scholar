import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nextMasteryState } from "@/lib/mastery";

/** POST { questionId: string, wasCorrect: boolean, studentAnswer?: string } */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { questionId, wasCorrect, studentAnswer } = await request.json().catch(() => ({}));
  if (!questionId || typeof wasCorrect !== "boolean") {
    return NextResponse.json({ error: "questionId and wasCorrect are required" }, { status: 400 });
  }

  const { data: question } = await supabase
    .from("questions")
    .select("id, quiz_id, quizzes(concept_id)")
    .eq("id", questionId)
    .single();
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  const conceptId = (question as any).quizzes?.concept_id;

  await supabase.from("quiz_attempts").insert({ user_id: user.id, question_id: questionId, was_correct: wasCorrect, student_answer: studentAnswer ?? null });

  let updatedMastery = null;
  if (conceptId) {
    const { data: current } = await supabase.from("mastery").select("*").eq("user_id", user.id).eq("concept_id", conceptId).single();
    const daysSince = current?.last_reviewed_at
      ? Math.floor((Date.now() - new Date(current.last_reviewed_at).getTime()) / 86_400_000)
      : null;
    const next = nextMasteryState({
      currentState: current?.state ?? "new",
      wasCorrect,
      correctStreak: current?.correct_streak ?? 0,
      daysSinceLastReview: daysSince,
    });
    const nextReviewAt = new Date(Date.now() + next.nextReviewInDays * 86_400_000).toISOString();

    const { data: saved } = await supabase
      .from("mastery")
      .upsert(
        {
          user_id: user.id,
          concept_id: conceptId,
          state: next.state,
          correct_streak: next.correctStreak,
          last_reviewed_at: new Date().toISOString(),
          next_review_at: nextReviewAt,
        },
        { onConflict: "user_id,concept_id" }
      )
      .select()
      .single();
    updatedMastery = saved;
  }

  return NextResponse.json({ ok: true, mastery: updatedMastery });
}
