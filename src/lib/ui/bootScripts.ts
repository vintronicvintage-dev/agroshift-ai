// Inline scripts that run in <head> before first paint. Kept in a plain (server-safe) module:
// exporting them from a "use client" file would turn them into client references.
export const THEME_KEY = "agroshift.theme";
export const LANG_KEY = "agroshift.lang";
export const INTRO_KEY = "agroshift.introSeen";
export const HINTS_KEY = "agroshift.hintsSeen";
export const GS_KEY = "agroshift.gettingStarted";

/** Explicit choice wins; otherwise the system preference on first visit (dark when the system says nothing). */
export const THEME_BOOT_SCRIPT = `(function(){var t;try{t=localStorage.getItem("${THEME_KEY}")}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.setAttribute("data-theme",t)})()`;

/** Sets <html lang> from the saved choice. */
export const LANG_BOOT_SCRIPT = `(function(){try{var l=localStorage.getItem("${LANG_KEY}");if(l==="en")document.documentElement.lang="en"}catch(e){}})()`;
