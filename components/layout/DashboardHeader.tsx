"use client";

import Image from "next/image";

export function DashboardHeader() {
  return (
    <header className="mx-auto mb-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-lg shadow-lg shadow-[#0296DF]/30">
          <Image
            src="/zota-dashboard/logo.png"
            alt="Zota AI Consulting"
            width={40}
            height={40}
            className="h-full w-full object-cover"
            priority
          />
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
