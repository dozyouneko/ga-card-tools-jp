// 使い方: node scripts/serve.mjs   （既定ポート 3000 / PORT 環境変数で変更可）
// 依存ゼロの静的ファイルサーバ。リポジトリルートを配信し、ローカルでサイトを確認する用。
// 将来 Next.js を導入したら `next dev` に置き換える想定。
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 3000);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let filePath = path.join(root, urlPath);

    // ディレクトリトラバーサル防止
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    // ディレクトリなら index.html を探す
    let s = await stat(filePath).catch(() => null);
    if (s && s.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      s = await stat(filePath).catch(() => null);
    }
    if (!s) {
      res.writeHead(404).end("Not Found");
      return;
    }
    const body = await readFile(filePath);
    const type = TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type }).end(body);
  } catch (e) {
    res.writeHead(500).end("Internal Server Error");
  }
});

server.listen(port, () => {
  console.log(`Serving ${root}`);
  console.log(`http://localhost:${port}/`);
});
