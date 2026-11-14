import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { PlanPage } from "@/components/plan/PlanPage";

export const metadata: Metadata = { title: "Ekim nöbeti | AgroShift" };

export default function Page() {
  return (
    <AppShell>
      <PlanPage />
    </AppShell>
  );
}
