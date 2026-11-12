import type { Metadata } from "next";
import { MethodsPage } from "@/components/methods/MethodsPage";

export const metadata: Metadata = {
  title: "Yöntem ve kaynaklar | AgroShift",
  description: "AgroShift formülleri, varsayımları, sınırları, veri kaynakları ve yapay zekâ kullanım beyanı.",
};

export default function Page() {
  return <MethodsPage />;
}
