import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { EvidencePage } from "@/components/dayanak/EvidencePage";

export const metadata: Metadata = { title: "Dayanak | AgroShift" };

export default function Page() {
  return (
    <AppShell>
      <EvidencePage />
    </AppShell>
  );
}
