"use client";

import { PeriodManager } from "./PeriodManager";
import { UserManager } from "./UserManager";
import { ClientManager } from "./ClientManager";
import { ProjectManager } from "./ProjectManager";
import { Separator } from "@/components/ui/separator";

export function SettingsTab() {
  return (
    <div className="space-y-8 p-5">
      <PeriodManager />
      <Separator className="bg-white/10" />
      <UserManager />
      <Separator className="bg-white/10" />
      <ClientManager />
      <Separator className="bg-white/10" />
      <ProjectManager />
    </div>
  );
}
