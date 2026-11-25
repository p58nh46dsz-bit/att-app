// Tests of the theme choice: the plain logic (src/components/shared/theme.js) and the startup script that the build
// puts into index.html, which paints the theme before the app loads. Run: npm test (after npm run build).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const THEME_SRC = fs.readFileSync(path.join(ROOT, "src/components/shared/theme.js"), "utf-8");

// A tiny page: <html data-theme>, a theme-color meta, localStorage and the phone's dark-mode setting.
function fakePage({ stored, systemDark }) {
  const attrs = {};
  const meta = { content: "#000000" };
  const ctx = {
    localStorage: { getItem: k => (k === "att_theme" ? stored : null) },
    document: {
      documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: k => attrs[k] },
      querySelector: sel => (sel.includes("theme-color") ? meta : null),
    },
    window: {},
  };
  ctx.window.matchMedia = q => ({ matches: q.includes("dark") ? systemDark : false });
  ctx.matchMedia = ctx.window.matchMedia;
  vm.createContext(ctx);
  return { ctx, attrs, meta };
}

test("theme.js: the choice and the theme it gives", () => {
  const { ctx } = fakePage({ stored: null, systemDark: false });
  vm.runInContext(THEME_SRC, ctx);
  const { themeChoice, resolveTheme, themeColor } = ctx;
  assert.equal(themeChoice("dark"), "dark");
  assert.equal(themeChoice("auto"), "auto");
  assert.equal(themeChoice("light"), "light");
  for (const junk of [null, undefined, "", "Dark", "night", 1, {}]) assert.equal(themeChoice(junk), "light", String(junk));
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("auto", true), "dark");
  assert.equal(resolveTheme("auto", false), "light");
  assert.equal(resolveTheme("garbage", true), "light");
  assert.equal(themeColor("dark"), "#0B0C0E");
  assert.equal(themeColor("light"), "#0A2A72");
});

// The startup script as it is in the built index.html (the one that runs on every launch).
function startupScript() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
  const m = html.match(/<script>([^<]*paintTheme\(resolveTheme\([^<]*)<\/script>/);
  assert.ok(m, "index.html has the theme startup script (run npm run build first)");
  return m[1];
}

test("index.html startup script: every saved choice with the phone light and dark", () => {
  const script = startupScript();
  const cases = [
    [JSON.stringify("light"), false, "light"], [JSON.stringify("light"), true, "light"],
    [JSON.stringify("dark"), false, "dark"], [JSON.stringify("dark"), true, "dark"],
    [JSON.stringify("auto"), false, "light"], [JSON.stringify("auto"), true, "dark"],
    [null, true, "light"],                                   // never chosen: light is the default
    ["{broken", true, "light"],                              // damaged storage must not break the launch
  ];
  for (const [stored, systemDark, want] of cases) {
    const { ctx, attrs, meta } = fakePage({ stored, systemDark });
    vm.runInContext(script, ctx);
    assert.equal(attrs["data-theme"], want, `stored=${stored} systemDark=${systemDark}`);
    if (stored !== "{broken") assert.equal(meta.content, want === "dark" ? "#0B0C0E" : "#0A2A72", `status bar for ${stored}`);
  }
});

test("the app bundle may declare the theme helpers again after the startup script", () => {
  const { ctx } = fakePage({ stored: JSON.stringify("dark"), systemDark: false });
  vm.runInContext(startupScript(), ctx);
  assert.doesNotThrow(() => vm.runInContext(THEME_SRC, ctx));   // no const/let clash between the two scripts
});
