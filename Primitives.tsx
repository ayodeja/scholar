import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-l border border-border bg-canvas p-[18px] ${className}`} {...props} />;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
      <div className="h-full rounded-full bg-blue" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Chip({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "amber" }) {
  const tones = {
    blue: "bg-soft-blue text-blue",
    green: "bg-green-bg text-green",
    amber: "bg-amber-bg text-amber",
  };
  return <span className={`inline-block rounded-full px-2.5 py-[3px] text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ icon, title, body }: { icon?: React.ReactNode; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center text-gray">
      {icon}
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="max-w-[260px] text-sm">{body}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-m border border-risk-bg bg-risk-bg p-4 text-sm text-risk">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-semibold underline">
          Try again
        </button>
      )}
    </div>
  );
}
