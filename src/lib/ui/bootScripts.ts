// Inline scripts that run in <head> before first paint. Kept in a plain (server-safe) module:
// exporting them from a "use client" file would turn them into client references.
export const THEME_KEY = "agroshift.theme";
export const LANG_KEY = "agroshift.lang";

/** Explicit theme choice, else the OS preference. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

/** Sets <html lang> from the saved choice. */
export const LANG_BOOT_SCRIPT = `(function(){try{var l=localStorage.getItem("${LANG_KEY}");if(l==="en")document.documentElement.lang="en"}catch(e){}})()`;
