// Theme choice: "light", "dark" or "auto" (follows the phone's setting). Plain functions only (no const/let at the top),
// because scripts/build.js also inlines this file into the startup script in <head>, before the app loads, and the same
// names must not clash when the app's bundle declares them again. Tested by scripts/theme.test.js.
function themeChoice(stored) {
  return stored === "dark" || stored === "auto" ? stored : "light";
}
function resolveTheme(choice, systemDark) {
  var c = themeChoice(choice);
  return c === "auto" ? (systemDark ? "dark" : "light") : c;
}
function themeColor(theme) {
  return theme === "dark" ? "#0B0C0E" : "#0A2A72";
}
function systemIsDark() {
  return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}
// Puts a theme on the page: the attribute the styles read and the colour of the phone's status bar.
function paintTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  var m = document.querySelector("meta[name=theme-color]");
  if (m) m.content = themeColor(theme);
}
