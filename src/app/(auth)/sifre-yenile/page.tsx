import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Yeni parola | AgroShift" };

export default function Page() {
  return <AuthPage kind="update" />;
}
