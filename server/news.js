// Academy news for the app: the list (signed in) and each article's picture (public, as on the academy's own site).
// The data comes from updateNews.js, which reads the academy's site on a schedule.
const fs = require("fs");
const path = require("path");
const pool = require("./db");

const FILES_DIR = process.env.FILES_DIR || path.join(__dirname, "uploads");

module.exports = function registerNews(app, requireUser) {
  app.get("/news", requireUser, async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
    const { rows } = await pool.query(
      `SELECT id, title, url, to_char(published, 'YYYY-MM-DD') AS date, summary, image_mime IS NOT NULL AS has_image
       FROM academy_news ORDER BY published DESC NULLS LAST, id DESC LIMIT $1`, [limit]);
    res.json(rows.map(r => ({ id: r.id, title: r.title, url: r.url, date: r.date, summary: r.summary, image: r.has_image ? `/news/${r.id}/image` : null })));
  });

  app.get("/news/:id/image", async (req, res) => {
    if (!/^\d{1,9}$/.test(req.params.id)) return res.status(400).end();
    const row = (await pool.query("SELECT image_mime FROM academy_news WHERE id = $1", [req.params.id])).rows[0];
    if (!row || !row.image_mime) return res.status(404).end();
    res.setHeader("Content-Type", row.image_mime);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    fs.createReadStream(path.join(FILES_DIR, "news", req.params.id)).on("error", () => res.status(404).end()).pipe(res);
  });
};
