"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ScholarMark } from "@/components/logo/ScholarMark";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const timer = setTimeout(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      router.replace(user ? "/home" : "/sign-in");
    }, 900);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas">
      <ScholarMark size={40} className="animate-pulse" />
      <div className="h-[3px] w-24 overflow-hidden rounded-full bg-border">
        <div className="h-full w-1/3 animate-[loadbar_1.4s_ease-in-out_infinite] rounded-full bg-blue" />
      </div>
      <style>{`
        @keyframes loadbar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
