import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import { LANG_BOOT_SCRIPT, THEME_BOOT_SCRIPT } from "@/lib/ui/bootScripts";
import { TraceProvider } from "@/components/trace/TraceProvider";
import { FieldDataProvider } from "@/components/data/FieldData";
import { CropPatternDefs } from "@/components/brand/CropPatternDefs";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://agroshift.app"),
  title: "AgroShift AI — Tarıma Bilimsel Modeller ve Uydu Verileriyle Yön Verin",
  description: "Türkiye tarım arazileri için yüksek çözünürlüklü uydu haritası, NASA POWER/MODIS/SMAP verileri ve FAO-56 su bütçesiyle 3 yıllık ekim nöbeti, verim, kârlılık ve risk simülasyonu platformu.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0b130e" },
  ],
};

const IMPECCABLE_CONTRACT = `<!--
THESIS: Anatolian Agronomic Command Center uniting parcel-level z20 satellite cartography, 24-year NASA Earth Observation series, and FAO-56/TOPSIS rotation decisions in one single-screen Bento workspace; refuses disjointed multi-page wizards and generic dark-neon SaaS dashboards.
OWN-WORLD: Deep Botanical Forest sidebar (#14361d..#1d4928) with emerald active pills (#2e7d32), sunlit ivory canvas (#f3f6ef), pure white Bento cards (#ffffff) with 16px radii and subtle green-tinted diffusion elevation, Archivo condensed tabular numerals, Instrument Sans UI, Geist Mono coordinates.
STORY: A Turkish farmer or agronomist locates any parcel across 81 provinces at sub-meter zoom, inspects real soil/climate/NDVI diagnostics, compares 3-year crop rotations, and stress-tests drought/heat/price risks before sowing.
FIRST VIEWPORT: Left forest-green command rail + top parcel/basin header + 5-metric KPI strip + split interactive z20 Turkey satellite map (with NASA layer checklist) beside live field status summary.
FORM: Brief-pinned Anatolian Agronomic Bento Command Center (candidate 3 grounded; seed key a3bd9b8b).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" data-theme="light" className={`${manrope.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: [THEME_BOOT_SCRIPT, LANG_BOOT_SCRIPT].join(";") }} />
      </head>
      <body className="font-sans antialiased">
        <div hidden aria-hidden="true" dangerouslySetInnerHTML={{ __html: IMPECCABLE_CONTRACT }} />
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
