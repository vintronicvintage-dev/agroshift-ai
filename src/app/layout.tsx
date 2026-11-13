import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import { GS_BOOT_SCRIPT, INTRO_BOOT_SCRIPT, LANG_BOOT_SCRIPT, THEME_BOOT_SCRIPT } from "@/lib/ui/bootScripts";
import { TraceProvider } from "@/components/trace/TraceProvider";
import "./globals.css";

/** UI, body and every number (tabular figures). */
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin", "latin-ext"],
});

/** Display face for titles and the verdict only. */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz", "wdth"],
});

export const metadata: Metadata = {
  title: "AgroShift: ekim nöbeti karar desteği",
  description:
    "NASA POWER, MODIS ve SoilGrids verisiyle üç yıllık ekim nöbeti stratejilerini su, toprak sağlığı, risk ve senaryo marjı açısından karşılaştırır. Karar vermez, karar destekler.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edf1e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1310" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" data-theme="dark" suppressHydrationWarning className={`${hanken.variable} ${bricolage.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: [THEME_BOOT_SCRIPT, LANG_BOOT_SCRIPT, INTRO_BOOT_SCRIPT, GS_BOOT_SCRIPT].join(";") }} />
      </head>
      <body className="min-h-full">
        <I18nProvider>
          <TraceProvider>{children}</TraceProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
