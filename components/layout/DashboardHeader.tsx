"use client";

import { Clock } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="mx-auto mb-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0296DF] to-[#023ABF] shadow-lg shadow-[#0296DF]/30">
          <Clock className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
            Zota AI Consulting
          </h1>
          <p className="text-xs tracking-widest text-[#64748B]">
            TIME &amp; EXPENSE TRACKING
          </p>
        </div>
      </div>
    </header>
  );
}
