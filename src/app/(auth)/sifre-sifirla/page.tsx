import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Parolanı sıfırla | AgroShift" };

export default function Page() {
  return <AuthPage kind="reset" />;
}
