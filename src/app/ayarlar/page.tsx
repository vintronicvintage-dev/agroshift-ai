"use client";

import Link from "next/link";
import { Globe2, Moon, Sun, User } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader, SectionCard } from "@/components/ui/AgroCard";
import { useAuthUser } from "@/lib/auth/useAuthUser";
import { useI18n } from "@/lib/i18n";
import { setTheme, useTheme } from "@/lib/ui/theme";

export default function SettingsPage() {
  const { lang, setLang } = useI18n();
  const theme = useTheme();
  const user = useAuthUser();
  const tr = lang === "tr";

  return (
    <AppShell>
      <div className="mx-auto max-w-[960px] space-y-6 px-4 py-6 sm:px-6">
        <PageHeader
          eyebrow={tr ? "Hesap ve Görünüm" : "Account & Preferences"}
          title={tr ? "Ayarlar" : "Settings"}
          description={tr ? "Dil, tema görünümü ve oturum bilgilerinizi buradan yönetebilirsiniz." : "Manage language, theme appearance, and account settings."}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <SectionCard title={tr ? "Dil ve Bölge" : "Language & Region"}>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLang("tr")}
                className={`btn flex-1 ${lang === "tr" ? "btn-primary" : ""}`}
              >
                <Globe2 className="size-4" />
                Türkçe (TR)
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`btn flex-1 ${lang === "en" ? "btn-primary" : ""}`}
              >
                <Globe2 className="size-4" />
                English (EN)
              </button>
            </div>
          </SectionCard>

          <SectionCard title={tr ? "Tema Görünümü" : "Theme Appearance"}>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`btn flex-1 ${theme === "light" ? "btn-primary" : ""}`}
              >
                <Sun className="size-4" />
                {tr ? "Açık Tema" : "Light Mode"}
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`btn flex-1 ${theme === "dark" ? "btn-primary" : ""}`}
              >
                <Moon className="size-4" />
                {tr ? "Koyu Tema" : "Dark Mode"}
              </button>
            </div>
          </SectionCard>
        </div>

        <SectionCard title={tr ? "Kullanıcı Profili ve Güvenlik" : "User Profile & Security"}>
          {user.status === "signed-in" ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-[#123D2A] text-white">
                  <User className="size-5" />
                </span>
                <div>
                  <div className="font-semibold text-ink">{user.name ?? user.email}</div>
                  <div className="text-[12.5px] text-ink-2">{user.email}</div>
                </div>
              </div>
              <Link href="/sifre-sifirla" className="btn btn-sm">
                {tr ? "Şifre Değiştir" : "Reset Password"}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-[13.5px] text-ink-2">
                {tr ? "Şu anda misafir oturumu kullanıyorsunuz." : "You are currently using a guest session."}
              </p>
              <Link href="/giris" className="btn btn-primary btn-sm">
                {tr ? "Giriş Yap / Kayıt Ol" : "Sign In / Register"}
              </Link>
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
