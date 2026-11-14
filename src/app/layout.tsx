import type { Metadata, Viewport } from "next";
import { Archivo, Geist_Mono, Instrument_Sans } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import { LANG_BOOT_SCRIPT, THEME_BOOT_SCRIPT } from "@/lib/ui/bootScripts";
import { TraceProvider } from "@/components/trace/TraceProvider";
import { FieldDataProvider } from "@/components/data/FieldData";
import { CropPatternDefs } from "@/components/brand/CropPatternDefs";
import "./globals.css";

/** Display and numerals: condensed width axis for hero numerals and plan names. */
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin", "latin-ext"], axes: ["wdth"] });
/** UI and body. */
const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin", "latin-ext"] });
/** Readouts only: units, coordinates, dates, source ids. Never sentences. */
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "AgroShift: tarlana uygun ekim nöbeti",
  description: "Tarlanı uydu görüntüsü üzerinde çiz, NASA verisiyle arazini tanı ve üç yıllık ekim nöbetini su, kazanç, toprak ve riskle karşılaştır. Karar senin.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e0c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" data-theme="dark" suppressHydrationWarning className={`${archivo.variable} ${instrument.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: [THEME_BOOT_SCRIPT, LANG_BOOT_SCRIPT].join(";") }} />
      </head>
      <body>
        <CropPatternDefs />
        <I18nProvider>
          <FieldDataProvider>
            <TraceProvider>{children}</TraceProvider>
          </FieldDataProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
