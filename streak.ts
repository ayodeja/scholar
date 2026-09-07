import { createClient } from "@/lib/supabase/server";

/** Consecutive distinct days with at least one real study_sessions row,
 * counting from today (or yesterday, so the streak survives until the
 * student has had a chance to study today). Never counts app-opens. */
export async function getStreak(userId: string): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase
    .from("study_sessions")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (!data || !data.length) return 0;

  const dayKeys = new Set(data.map((r: { created_at: string }) => new Date(r.created_at).toDateString()));
  let cursor = new Date();
  if (!dayKeys.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (dayKeys.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
