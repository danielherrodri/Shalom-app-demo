"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webm": "video/webm",
  ".vtt": "text/vtt; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".md": "text/plain; charset=utf-8",
};
const server = http.createServer((req, res) => {
  let p;
  try {
    p = path.resolve(
      root,
      "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
    );
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (p !== root && !p.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  if (p === root) p = path.join(root, "index.html");
  fs.readFile(p, (err, data) => {
    if (err) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(p)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
});
if (require.main === module)
  server.listen(4173, "127.0.0.1", () =>
    console.log("Demo en http://127.0.0.1:4173"),
  );
module.exports = server;
