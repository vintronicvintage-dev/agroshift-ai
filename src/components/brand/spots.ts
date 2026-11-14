/**
 * Empty-state spots (docs/brand.md §7): 240x160, monoline 2 units, currentColor, secondary lines at
 * 40 % opacity. Static, hand-authored markup (no user input), rendered inline by <SpotArt />.
 * Hand-authored; keep public/illustrations/spots/*.svg in sync when a drawing changes.
 */
export type SpotName = "no-field" | "loading-data" | "no-alerts" | "email-sent" | "draw-field" | "data-cells" | "offline" | "print-share";

export const SPOT_MARKUP: Readonly<Record<SpotName, string>> = {
  "no-field": "<g opacity=\".4\"><path d=\"M24 128H216M24 128L52 40M216 128L196 40M52 40H196M96 40L84 128M150 40L160 128M68 84H206\"/><path d=\"M30 108H86M34 96H88M161 112H210M160 100H208\" stroke-width=\"1.5\"/></g><path d=\"M92 62L150 56L162 104L86 110Z\" stroke-dasharray=\"6 5\"/><path d=\"M124 84c-7-8-12-14-12-21a12 12 0 0 1 24 0c0 7-5 13-12 21Z\"/><circle cx=\"124\" cy=\"63\" r=\"4\"/>",
  "loading-data": "<g opacity=\".4\"><path d=\"M20 74A118 62 0 0 1 220 74\" stroke-dasharray=\"6 5\"/></g><g transform=\"rotate(-20 170 40)\"><rect x=\"164\" y=\"34\" width=\"12\" height=\"12\" rx=\"1\"/><path d=\"M150 40H162M178 40H190M150 34V46M190 34V46\"/></g><g opacity=\".4\"><path d=\"M164 52L66 112M176 52L180 106\"/></g><path d=\"M66 112L180 106L190 144L54 148Z\"/><g opacity=\".4\"><path d=\"M70 122H186M66 132H188\" stroke-width=\"1.5\"/></g><path d=\"M60 128L188 124\"/>",
  "no-alerts": "<path d=\"M40 70L150 62L166 134L30 140Z\"/><g opacity=\".4\"><path d=\"M44 84L154 77M40 98L157 91M37 112L160 105M34 126L163 120\" stroke-width=\"1.5\"/></g><circle cx=\"178\" cy=\"52\" r=\"20\"/><path d=\"M168 52l7 7l13-14\"/>",
  "email-sent": "<path d=\"M60 64H156V126H60Z\"/><path d=\"M60 64l48 36l48-36\"/><g opacity=\".4\"><path d=\"M164 70C186 56 196 40 200 24\" stroke-dasharray=\"6 5\"/></g><path d=\"M192 26l8-4l2 9\"/>",
  "draw-field": "<g opacity=\".4\"><path d=\"M24 128H216M24 128L52 40M216 128L196 40M52 40H196M96 40L84 128M150 40L160 128M68 84H206\"/><path d=\"M30 108H86M34 96H88M161 112H210M160 100H208\" stroke-width=\"1.5\"/></g><g opacity=\".4\"><path d=\"M150 44L196 82L150 128\" stroke-dasharray=\"6 5\"/></g><rect x=\"192.5\" y=\"78.5\" width=\"7\" height=\"7\" fill=\"none\" opacity=\".4\"/><path d=\"M64 58L150 44L184 96L150 128L72 118Z\"/><rect x=\"60.5\" y=\"54.5\" width=\"7\" height=\"7\" fill=\"currentColor\"/><rect x=\"146.5\" y=\"40.5\" width=\"7\" height=\"7\" fill=\"currentColor\"/><rect x=\"180.5\" y=\"92.5\" width=\"7\" height=\"7\" fill=\"currentColor\"/><rect x=\"146.5\" y=\"124.5\" width=\"7\" height=\"7\" fill=\"currentColor\"/><rect x=\"68.5\" y=\"114.5\" width=\"7\" height=\"7\" fill=\"currentColor\"/>",
  "data-cells": "<g opacity=\".4\"><path d=\"M40 20H200V140H40Z\"/><path d=\"M80 20V140M120 20V140M160 20V140M40 60H200M40 100H200\" stroke-width=\"1.5\"/></g><g opacity=\".55\"><path d=\"M90 50V110M100 50V110M110 50V110M120 50V110M130 50V110M140 50V110M150 50V110M80 50H160M80 60H160M80 70H160M80 80H160M80 90H160M80 100H160M80 110H160M80 50V110M160 50V110\" stroke-width=\"1\"/></g><path d=\"M92 58L148 54L152 100L96 106Z\" stroke-width=\"2.5\"/>",
  "offline": "<g opacity=\".4\"><path d=\"M24 136H216\"/><path d=\"M48 148H192\" stroke-width=\"1.5\"/></g><path d=\"M104.7 107.1A20 20 0 0 1 135.3 107.1\"/><g opacity=\".4\"><path d=\"M89.4 94.3A40 40 0 0 1 150.6 94.3\" stroke-dasharray=\"6 5\"/><path d=\"M74 81.4A60 60 0 0 1 166 81.4\" stroke-dasharray=\"6 5\"/></g><circle cx=\"120\" cy=\"120\" r=\"3\" fill=\"currentColor\"/><path d=\"M168 38l20 20M188 38l-20 20\"/>",
  "print-share": "<path d=\"M72 22H152V136H72Z\"/><g opacity=\".4\"><path d=\"M82 34H122M82 108H140M82 118H130M82 128H136\" stroke-width=\"1.5\"/></g><path d=\"M82 48H112V68H82Z\"/><path d=\"M82 80H104V94H82ZM106 80H124V94H106ZM126 80H142V94H126Z\" stroke-width=\"1.5\"/><g opacity=\".4\"><path d=\"M86 80L82 84M92 80L82 90M98 80L84 94M104 82L92 94M104 88L98 94M110 80V94M114 80V94M118 80V94M122 80V94\" stroke-width=\"1\"/></g><circle cx=\"178\" cy=\"70\" r=\"6\"/><circle cx=\"204\" cy=\"50\" r=\"6\"/><circle cx=\"204\" cy=\"92\" r=\"6\"/><path d=\"M183.4 66.6L198.6 54M183.4 73.4L198.6 88.6\"/>",
};

export const SPOT_TITLES: Readonly<Record<SpotName, { tr: string; en: string }>> = {
  "no-field": { tr: "Tarla seçilmedi", en: "No field selected" },
  "loading-data": { tr: "Uydu verisi yükleniyor", en: "Loading satellite data" },
  "no-alerts": { tr: "Uyarı yok", en: "No alerts" },
  "email-sent": { tr: "E-posta gönderildi", en: "Email sent" },
  "draw-field": { tr: "Tarlanı çiz", en: "Draw your field" },
  "data-cells": { tr: "Veri hücreleri", en: "Data cells" },
  "offline": { tr: "Bağlantı yok ya da yavaş", en: "Offline or slow connection" },
  "print-share": { tr: "Raporu yazdır ya da paylaş", en: "Print or share the report" },
};
