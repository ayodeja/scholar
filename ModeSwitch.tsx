"use client";

import { useState } from "react";

const MODES = ["simple", "academic", "exam"] as const;
type Mode = (typeof MODES)[number];

export function ModeSwitch({ text }: { text: Record<Mode, string> }) {
  const [mode, setMode] = useState<Mode>("simple");
  return (
    <div>
      <div className="mb-5 flex rounded-[10px] bg-border p-[3px]">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg py-2 text-[13px] font-semibold capitalize ${mode === m ? "bg-canvas text-ink" : "text-gray"}`}
          >
            {m}
          </button>
        ))}
      </div>
      <p className="font-serif text-[16.5px] leading-relaxed">{text[mode]}</p>
    </div>
  );
}
