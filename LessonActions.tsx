"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function LessonActions({ conceptId, title }: { conceptId: string; title: string }) {
  const router = useRouter();

  async function markUnderstood() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("study_sessions").insert({ user_id: user.id, activity_type: "lesson", concept_id: conceptId });
    }
    router.push("/home");
  }

  return (
    <div className="mt-7 flex gap-2.5">
      <Button variant="outline" className="flex-1" onClick={markUnderstood}>
        I understand this
      </Button>
      <Button className="flex-1" onClick={() => router.push(`/tutor?conceptId=${conceptId}&topic=${encodeURIComponent(title)}`)}>
        I need help
      </Button>
    </div>
  );
}
