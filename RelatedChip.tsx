"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RelatedChip({ title }: { title: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function open() {
    if (loading) return;
    setLoading(true);
    const res = await fetch("/api/gemini/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: title }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) router.push(`/learn/${data.conceptId}`);
  }

  return (
    <button onClick={open} disabled={loading} className="rounded-full bg-soft-blue px-3.5 py-[7px] text-[13px] font-semibold text-blue disabled:opacity-50">
      {loading ? "Loading..." : title}
    </button>
  );
}
