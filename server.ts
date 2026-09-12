// server.ts
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3002", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || "", true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const wss = new WebSocketServer({ server, path: "/api/ws" });

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
    const pathParts = url.pathname?.split("/") || [];
    // /api/ws/scenes/:sceneId
    const sceneId = pathParts[3];

    if (!sceneId) {
      ws.close();
      return;
    }

    let userId = "user-" + Math.random().toString(36).slice(2, 8);
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
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/ws`);
  });
});
