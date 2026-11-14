import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Hesap oluştur | AgroShift" };

export default function Page() {
  return <AuthPage kind="signUp" />;
}
