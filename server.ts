// server.ts
import { createReadStream, existsSync, statSync } from "fs";
import { createServer } from "http";
import { extname, resolve, sep } from "path";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3002", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const uploadsRoot = resolve(process.cwd(), "public", "uploads");
const uploadMimeTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

app.prepare().then(() => {
  console.log(`> Uploads root: ${uploadsRoot}`);

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || "", true);
      const pathname = parsedUrl.pathname || "/";

      if (pathname.startsWith("/uploads/")) {
        let relativePath: string;

        try {
          relativePath = decodeURIComponent(pathname.slice("/uploads/".length));
        } catch {
          res.statusCode = 400;
          res.end("Bad Request");
          return;
        }

        const filePath = resolve(uploadsRoot, relativePath);
        const isInsideUploads =
          filePath === uploadsRoot || filePath.startsWith(`${uploadsRoot}${sep}`);

        if (!isInsideUploads) {
          console.warn(`[uploads] blocked path: ${pathname} -> ${filePath}`);
          res.statusCode = 403;
          res.end("Forbidden");
          return;
        }

        if (!existsSync(filePath) || !statSync(filePath).isFile()) {
          console.warn(
            `[uploads] 404 pathname=${pathname} cwd=${process.cwd()} root=${uploadsRoot} file=${filePath}`,
          );
          res.statusCode = 404;
          res.end("Not Found");
          return;
        }

        const fileStat = statSync(filePath);
        const extension = extname(filePath).toLowerCase();

        res.statusCode = 200;
        res.setHeader(
          "Content-Type",
          uploadMimeTypes[extension] || "application/octet-stream",
        );
        res.setHeader("Content-Length", fileStat.size);
        res.setHeader("Cache-Control", "public, max-age=86400");

        if (req.method === "HEAD") {
          res.end();
          return;
        }

        createReadStream(filePath).pipe(res);
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);

      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Internal Server Error");
      } else {
        res.end();
      }
    }
  });

  const wss = new WebSocketServer({ server });

  // Scene rooms: Map<sceneId, Map<userId, { ws, userName }>>
  const rooms = new Map<string, Map<string, { ws: WebSocket; userName: string }>>();

  function broadcast(sceneId: string, message: string, excludeUserId?: string) {
    const room = rooms.get(sceneId);
    if (!room) return;
    for (const [userId, client] of room) {
      if (userId !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  wss.on("connection", (ws, req) => {
    const url = parse(req.url || "", true);
    const pathParts = (url.pathname || "").split("/");

    // Expected path: /api/ws/scenes/:sceneId
    if (
      pathParts[1] !== "api" ||
      pathParts[2] !== "ws" ||
      pathParts[3] !== "scenes" ||
      !pathParts[4]
    ) {
      ws.close(1008, "Invalid WebSocket route");
      return;
    }

    const sceneId = pathParts[4];

    const userId = "user-" + Math.random().toString(36).slice(2, 8);
    let userName = "Anonyme";

    if (!rooms.has(sceneId)) {
      rooms.set(sceneId, new Map());
    }
    const room = rooms.get(sceneId)!;

    // Parse user info from query
    const queryUserName = url.query?.name as string;
    if (queryUserName) userName = decodeURIComponent(queryUserName);

    // Register user
    room.set(userId, { ws, userName });

    // Notify others
    broadcast(sceneId, JSON.stringify({ type: "user:join", userId, userName }), userId);

    // Send current online users to new user
    for (const [uid, client] of room) {
      if (uid !== userId) {
        ws.send(JSON.stringify({ type: "user:join", userId: uid, userName: client.userName }));
      }
    }

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        msg.userId = userId;
        msg.userName = userName;
        broadcast(sceneId, JSON.stringify(msg), userId);
      } catch {}
    });

    ws.on("close", () => {
      room.delete(userId);
      broadcast(sceneId, JSON.stringify({ type: "user:leave", userId }));
      if (room.size === 0) {
        rooms.delete(sceneId);
      }
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Narra ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/ws/scenes/:sceneId`);
  });
});
