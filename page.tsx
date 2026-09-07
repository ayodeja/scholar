"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ScholarMark } from "@/components/logo/ScholarMark";
import { Button } from "@/components/ui/Button";

const GOALS = ["University exams", "Continuous assessment", "Professional exams", "Personal learning", "General knowledge"];
const STYLES = ["Reading", "Practice questions", "Flashcards", "Interactive explanations"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [subjects, setSubjects] = useState("");
  const [goal, setGoal] = useState<string | null>(null);
  const [styles, setStyles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleStyle(s: string) {
    setStyles((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function finish() {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({
          subjects: subjects.split(",").map((s) => s.trim()).filter(Boolean),
          preparing_for: goal,
          learning_style: styles,
          onboarded_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }
    router.replace("/home");
  }

  return (
    <div className="flex min-h-screen flex-col justify-between px-6 py-10">
      <div>
        <div className="mb-8 flex justify-center"><ScholarMark size={30} /></div>

        {step === 0 && (
          <div>
            <h1 className="mb-2 font-serif text-2xl font-semibold">What are you studying?</h1>
            <p className="mb-5 text-sm text-gray">Separate subjects with commas.</p>
            <input
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              placeholder="Nigerian Legal System, Business Law..."
              className="w-full rounded-m border border-border-strong px-4 py-3 text-[15px] outline-none focus:border-blue"
            />
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="mb-5 font-serif text-2xl font-semibold">What are you preparing for?</h1>
            <div className="flex flex-col gap-2">
              {GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={`rounded-m border px-4 py-3 text-left text-[15px] font-medium ${goal === g ? "border-blue bg-soft-blue text-blue" : "border-border-strong"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="mb-5 font-serif text-2xl font-semibold">How do you prefer to learn?</h1>
            <div className="flex flex-col gap-2">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStyle(s)}
                  className={`rounded-m border px-4 py-3 text-left text-[15px] font-medium ${styles.includes(s) ? "border-blue bg-soft-blue text-blue" : "border-border-strong"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 ? !subjects.trim() : !goal} className="flex-1">
            Continue
          </Button>
        ) : (
          <Button onClick={finish} disabled={saving || styles.length === 0} className="flex-1">
            {saving ? "Saving..." : "Start learning"}
          </Button>
        )}
      </div>
    </div>
  );
}
