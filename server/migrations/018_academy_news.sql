-- Migration 018: academy news, taken from the academy's site (updateNews.js, run on a schedule). The picture of each
-- article is downloaded to FILES_DIR/news/<id> and served by the API, because the site only answers over http.
CREATE TABLE academy_news (
  id          integer     PRIMARY KEY,             -- the article number on the site (/att/news/<id>-...)
  title       text        NOT NULL,
  url         text        NOT NULL,
  published   date,                                -- from the address, the picture's name or the text; may be unknown
  summary     text        NOT NULL DEFAULT '',
  image_mime  text,                                -- set when the picture is stored
  fetched_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX academy_news_order_idx ON academy_news (published DESC NULLS LAST, id DESC);
