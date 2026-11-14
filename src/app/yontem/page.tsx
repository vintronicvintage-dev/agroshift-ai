import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { MethodsPage } from "@/components/yontem/MethodsPage";

export const metadata: Metadata = {
  title: "Yöntem ve kaynaklar | AgroShift",
  description: "AgroShift formülleri, varsayımları, sınırları, veri kaynakları, görsel kaynakları ve yapay zekâ kullanım beyanı.",
};

export default function Page() {
  return (
    <AppShell>
      <MethodsPage />
    </AppShell>
  );
}
