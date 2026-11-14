// Inline scripts that run in <head> before first paint. Kept in a plain (server-safe) module:
// exporting them from a "use client" file would turn them into client references.
export const THEME_KEY = "agroshift.theme";
export const LANG_KEY = "agroshift.lang";
export const INTRO_KEY = "agroshift.introSeen";
export const HINTS_KEY = "agroshift.hintsSeen";
export const GS_KEY = "agroshift.gettingStarted";

/** Explicit theme choice, else dark (the app is dark first; light stays one click away). */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t="dark"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

/** Sets <html lang> from the saved choice. */
export const LANG_BOOT_SCRIPT = `(function(){try{var l=localStorage.getItem("${LANG_KEY}");if(l==="en")document.documentElement.lang="en"}catch(e){}})()`;

/**
 * The full-screen intro no longer opens by itself (the "Getting started" cards replaced it); it
 * opens on request. This only restores which one-line hints were dismissed (html[data-hints-seen]).
 */
export const INTRO_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{var h=localStorage.getItem("${HINTS_KEY}");if(h)d.setAttribute("data-hints-seen",h)}catch(e){}})()`;

/**
 * Getting-started strip: html[data-gs] = "" | "done" | "dismissed" (space separated) before
 * first paint, so a dismissed strip never flashes. Stored JSON: {"done":[...],"dismissed":bool}.
 */
export const GS_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{var s=JSON.parse(localStorage.getItem("${GS_KEY}")||"null");if(!s)return;var a=[];if(s.dismissed)a.push("dismissed");if(Array.isArray(s.done)&&s.done.length>=5&&!s.reopened)a.push("done");if(a.length)d.setAttribute("data-gs",a.join(" "))}catch(e){}})()`;
