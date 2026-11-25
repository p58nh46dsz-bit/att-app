// Takes the latest news from the academy's site into the database: title, link, date, a short summary and the picture.
// The picture is saved to FILES_DIR/news/<id> and served by the API (/news/:id/image): the site only answers over http,
// so its pictures could not be shown on the https site. Run on a schedule (docs/DEPLOY.md, step 9):
//   npm run news:update
// Safe to run any time: known articles only get their title refreshed, new ones are read in full.
const fs = require("fs");
const path = require("path");
const pool = require("./db");

const SITE = "http://xn--80a0ba.xn--90a1af.xn--p1ai";   // атт.спб.рф
const LIST = `${SITE}/att/news`;
const TAKE = 12;                                        // the newest articles on the first page
const FILES_DIR = process.env.FILES_DIR || path.join(__dirname, "uploads");
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

const get = url => fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; att-app news reader)" }, signal: AbortSignal.timeout(30000) })
  .then(r => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r; });

const decode = s => s.replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&laquo;/g, "«").replace(/&raquo;/g, "»")
  .replace(/&nbsp;/g, " ").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—").replace(/&amp;/g, "&");
const text = html => decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

// A date written as 2026-10-14 (in the address or the picture's name) or as «14 октября 2026» in the text.
function findDate(...sources) {
  for (const s of sources) {
    const iso = s && s.match(/(20\d\d)-(\d\d)-(\d\d)/);
    if (iso && +iso[2] >= 1 && +iso[2] <= 12 && +iso[3] >= 1 && +iso[3] <= 31) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const body = sources[sources.length - 1] || "";
  const ru = body.match(new RegExp(`(\\d{1,2})\\s+(${MONTHS.join("|")})\\s+(20\\d\\d)`));
  if (ru) return `${ru[3]}-${String(MONTHS.indexOf(ru[2]) + 1).padStart(2, "0")}-${ru[1].padStart(2, "0")}`;
  return null;
}

// A summary of about 220 characters, cut at a word.
function summarize(s, title) {
  let t = s.startsWith(title) ? s.slice(title.length).trim() : s;
  if (t.length <= 220) return t;
  t = t.slice(0, 220);
  return t.slice(0, t.lastIndexOf(" ")).replace(/[,.;:–—-]+$/, "") + "…";
}

async function readArticle(item) {
  const html = await (await get(item.url)).text();
  const start = html.indexOf('class="item-page');
  const part = start >= 0 ? html.slice(html.indexOf(">", start) + 1, start + 40000) : html;   // after the opening tag itself
  const img = (part.match(/<img[^>]+src="([^"]+)"/) || [])[1] || null;
  const body = text(part);
  return { date: findDate(item.url, img, body), summary: summarize(body, item.title), img };
}

async function savePicture(id, src) {
  const r = await get(new URL(src, SITE).href);
  const mime = (r.headers.get("content-type") || "").split(";")[0].trim();
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  if (!buf.length || buf.length > 15 * 1024 * 1024) return null;
  await fs.promises.mkdir(path.join(FILES_DIR, "news"), { recursive: true });
  await fs.promises.writeFile(path.join(FILES_DIR, "news", String(id)), buf);
  return mime;
}

(async () => {
  const html = await (await get(LIST)).text();
  const items = [];
  const re = /<td class="list-title"[^>]*>\s*<a href="(\/att\/news\/(\d+)-[^"]*)">\s*([\s\S]*?)<\/a>/g;
  for (let m; (m = re.exec(html)) && items.length < TAKE;) items.push({ id: Number(m[2]), url: SITE + m[1], title: text(m[3]) });
  if (!items.length) throw new Error("no news found on the page: the site layout may have changed");

  const known = new Map((await pool.query("SELECT id, image_mime FROM academy_news WHERE id = ANY($1)", [items.map(i => i.id)])).rows.map(r => [r.id, r]));
  let added = 0;
  for (const item of items) {
    if (known.has(item.id)) {
      await pool.query("UPDATE academy_news SET title = $2, fetched_at = now() WHERE id = $1", [item.id, item.title]);
      continue;
    }
    try {
      const a = await readArticle(item);
      const mime = a.img ? await savePicture(item.id, a.img).catch(() => null) : null;
      await pool.query(
        `INSERT INTO academy_news (id, title, url, published, summary, image_mime) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, url = EXCLUDED.url, published = EXCLUDED.published,
           summary = EXCLUDED.summary, image_mime = EXCLUDED.image_mime, fetched_at = now()`,
        [item.id, item.title, item.url, a.date, a.summary, mime]);
      added++;
    } catch (e) {
      console.error(`news ${item.id}: ${e.message}`);
    }
  }
  console.log(`news: ${items.length} on the page, ${added} new`);
  await pool.end();
})().catch(async e => { console.error(e.message); await pool.end().catch(() => {}); process.exit(1); });
