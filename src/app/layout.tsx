import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono, Newsreader } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import { GS_BOOT_SCRIPT, INTRO_BOOT_SCRIPT, LANG_BOOT_SCRIPT, THEME_BOOT_SCRIPT } from "@/lib/ui/bootScripts";
import { TraceProvider } from "@/components/trace/TraceProvider";
import "./globals.css";

/** UI, body and every number (tabular figures). */
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin", "latin-ext"],
});

/** Notebook voice: a text serif for page titles, section titles and the verdict. Never for labels. */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
});

/** Instrument voice: measured readouts only (big numbers, units beside them). */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "AgroShift: ekim nöbeti karar desteği",
  description:
    "Tarlanın şu anki üç yıllık ekim sırasını, NASA POWER, MODIS ve SoilGrids verisiyle başka sıralarla karşılaştırır: su, toprak sağlığı, risk ve kâr. Karar vermez, kararına destek olur.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edf1e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1310" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" data-theme="dark" suppressHydrationWarning className={`${hanken.variable} ${newsreader.variable} ${plexMono.variable} h-full`}>
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
