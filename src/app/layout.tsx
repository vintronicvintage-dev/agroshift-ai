import type { Metadata, Viewport } from "next";
import { Public_Sans, Spectral } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import { INTRO_BOOT_SCRIPT, LANG_BOOT_SCRIPT, THEME_BOOT_SCRIPT } from "@/lib/ui/bootScripts";
import { TraceProvider } from "@/components/trace/TraceProvider";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { SiteFooter } from "@/components/shell/SiteFooter";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin", "latin-ext"],
});

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "AgroShift: ekim nöbeti karar desteği",
  description:
    "NASA POWER, MODIS ve SoilGrids verisiyle üç yıllık ekim nöbeti stratejilerini su, toprak sağlığı, risk ve senaryo marjı açısından karşılaştırır. Karar vermez, karar destekler.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e6ebe2" },
    { media: "(prefers-color-scheme: dark)", color: "#101713" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" data-theme="light" suppressHydrationWarning className={`${publicSans.variable} ${spectral.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT + ";" + LANG_BOOT_SCRIPT + ";" + INTRO_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider>
          <TraceProvider>
            <SiteHeader />
            <div id="icerik" tabIndex={-1} className="flex-1 outline-none">
              {children}
            </div>
            <SiteFooter />
          </TraceProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
