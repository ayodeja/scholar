import { Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStreak } from "@/lib/streak";
import { ScholarMark } from "@/components/logo/ScholarMark";
import { BottomNav } from "@/components/nav/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const streak = user ? await getStreak(user.id) : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-canvas px-5 py-4">
        <div className="flex items-center gap-2">
          <ScholarMark size={24} />
          <span className="text-[17px] font-semibold tracking-tight">Scholar</span>
        </div>
        <div className="flex items-center gap-1 text-sm font-semibold text-amber">
          <Flame size={18} />
          <span>{streak}</span>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-5 pb-6 pt-5">{children}</main>
      <BottomNav />
    </div>
  );
}
