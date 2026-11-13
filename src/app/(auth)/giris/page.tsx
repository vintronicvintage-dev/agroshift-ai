import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Giriş yap | AgroShift" };

export default function Page() {
  return <AuthPage kind="signIn" />;
}
