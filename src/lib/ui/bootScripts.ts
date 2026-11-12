// Inline scripts that run in <head> before first paint. Kept in a plain (server-safe) module:
// exporting them from a "use client" file would turn them into client references.
export const THEME_KEY = "agroshift.theme";
export const LANG_KEY = "agroshift.lang";
export const INTRO_KEY = "agroshift.introSeen";
export const HINTS_KEY = "agroshift.hintsSeen";

/** Explicit theme choice, else the OS preference. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

/** Sets <html lang> from the saved choice. */
export const LANG_BOOT_SCRIPT = `(function(){try{var l=localStorage.getItem("${LANG_KEY}");if(l==="en")document.documentElement.lang="en"}catch(e){}})()`;

/**
 * Decides before first paint whether the welcome overlay shows (html[data-intro="open"]) and which
 * one-line hints were already dismissed (html[data-hints-seen]). The markup is always server-rendered
 * and CSS does the showing, so nothing jumps and server and client HTML stay identical.
 * Without storage the intro simply shows every time.
 */
export const INTRO_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{if(localStorage.getItem("${INTRO_KEY}")!=="1")d.setAttribute("data-intro","open");var h=localStorage.getItem("${HINTS_KEY}");if(h)d.setAttribute("data-hints-seen",h)}catch(e){d.setAttribute("data-intro","open")}})()`;
