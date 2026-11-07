import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8765);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ogg": "audio/ogg",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

http
  .createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const file = path.resolve(
        root,
        "." + pathname + (pathname.endsWith("/") ? "index.html" : ""),
      );
      if (
        !file.startsWith(root + path.sep) ||
        path
          .relative(root, file)
          .split(path.sep)
          .some((part) => part.startsWith("."))
      ) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const body = await fs.readFile(file);
      response.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`Musée : http://127.0.0.1:${port}/musee.html`);
  });
