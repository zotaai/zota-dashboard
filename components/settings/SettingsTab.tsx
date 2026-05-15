"use client";

import { PeriodManager } from "./PeriodManager";
import { UserManager } from "./UserManager";
import { AreaManager } from "./AreaManager";
import { Separator } from "@/components/ui/separator";

export function SettingsTab() {
  return (
    <div className="space-y-8 p-5">
      <PeriodManager />
      <Separator className="bg-white/10" />
      <UserManager />
      <Separator className="bg-white/10" />
      <AreaManager />
    </div>
  );
}
