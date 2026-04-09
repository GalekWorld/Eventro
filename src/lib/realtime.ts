import type { IncomingMessage, Server as HttpServer } from "http";
import type { Duplex } from "stream";
import { db } from "./db";
import { WebSocket, WebSocketServer } from "ws";

type RealtimeTopic = `user:${string}` | `conversation:${string}` | `group:${string}` | `event:${string}`;

type RealtimePayload = {
  type: string;
  entityId?: string;
  topic?: string;
  actorId?: string;
  data?: Record<string, string | number | boolean | null>;
  at: number;
};

type HubSocket = WebSocket & {
  isAlive?: boolean;
  topics?: Set<RealtimeTopic>;
  userId?: string;
};

type RealtimeHub = {
  wsServer?: WebSocketServer;
  channels: Map<RealtimeTopic, Set<HubSocket>>;
};

declare global {
  // eslint-disable-next-line no-var
  var __eventroRealtimeHub: RealtimeHub | undefined;
}

function getRealtimeHub(): RealtimeHub {
  if (!global.__eventroRealtimeHub) {
    global.__eventroRealtimeHub = {
      channels: new Map(),
    };
  }

  return global.__eventroRealtimeHub;
}

function getCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

async function getUserIdFromRequest(req: IncomingMessage) {
  const sessionToken = getCookieValue(req.headers.cookie, "session");
  if (!sessionToken) return null;

  const session = await db.session.findUnique({
    where: { token: sessionToken },
    select: {
      expiresAt: true,
      userId: true,
    },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await db.session.delete({
      where: { token: sessionToken },
    }).catch(() => null);
    return null;
  }

  return session.userId;
}

async function canSubscribe(userId: string, topic: string): Promise<boolean> {
  if (topic === `user:${userId}`) {
    return true;
  }

  if (topic.startsWith("conversation:")) {
    const conversationId = topic.slice("conversation:".length);
    if (!conversationId) return false;

    const conversation = await db.directConversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { id: true },
    });

    return Boolean(conversation);
  }

  if (topic.startsWith("group:")) {
    const groupId = topic.slice("group:".length);
    if (!groupId) return false;

    const membership = await db.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      select: { id: true },
    });

    return Boolean(membership);
  }

  if (topic.startsWith("event:")) {
    const eventId = topic.slice("event:".length);
    if (!eventId) return false;

    const [participant, user, event] = await Promise.all([
      db.eventChatParticipant.findFirst({
        where: {
          eventId,
          userId,
        },
        select: { id: true },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { role: true },
      }),
      db.event.findUnique({
        where: { id: eventId },
        select: { ownerId: true },
      }),
    ]);

    if (participant) return true;
    if (!event) return false;

    return event.ownerId === userId || user?.role === "ADMIN";
  }

  return false;
}

function subscribeSocket(socket: HubSocket, topic: RealtimeTopic) {
  const hub = getRealtimeHub();
  const channel = hub.channels.get(topic) ?? new Set<HubSocket>();
  channel.add(socket);
  socket.topics ??= new Set();
  socket.topics.add(topic);
  hub.channels.set(topic, channel);
}

function unsubscribeSocket(socket: HubSocket) {
  const hub = getRealtimeHub();
  const topics = socket.topics ?? new Set<RealtimeTopic>();

  for (const topic of topics) {
    const channel = hub.channels.get(topic);
    if (!channel) continue;

    channel.delete(socket);
    if (channel.size === 0) {
      hub.channels.delete(topic);
    }
  }

  socket.topics?.clear();
}

export async function installRealtimeServer(
  server: HttpServer,
  fallbackUpgradeHandler?: (req: IncomingMessage, socket: Duplex, head: Buffer) => void,
) {
  const hub = getRealtimeHub();

  if (hub.wsServer) {
    return hub.wsServer;
  }

  const wsServer = new WebSocketServer({ noServer: true });
  hub.wsServer = wsServer;

  wsServer.on("connection", (socket: HubSocket) => {
    socket.isAlive = true;

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.on("close", () => {
      unsubscribeSocket(socket);
    });

    socket.on("error", () => {
      unsubscribeSocket(socket);
    });

    socket.on("message", (raw) => {
      try {
        const payload = JSON.parse(String(raw)) as { type?: string; topic?: string };

        if (payload.type !== "typing" || !payload.topic) {
          return;
        }

        const topic = payload.topic as RealtimeTopic;
        if (!socket.topics?.has(topic) || !socket.userId) {
          return;
        }

        broadcastToTopic(topic, {
          type: "typing",
          topic,
          actorId: socket.userId,
        }, socket);
      } catch {
        // ignore malformed client realtime messages
      }
    });

    socket.send(JSON.stringify({ type: "connected", at: Date.now() }));
  });

  server.on("upgrade", async (req, socket, head) => {
    try {
      const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

      if (requestUrl.pathname !== "/ws") {
        fallbackUpgradeHandler?.(req, socket, head);
        return;
      }

      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const requestedTopics = requestUrl.searchParams.getAll("topic");
      const allowedTopics = new Set<RealtimeTopic>([`user:${userId}`]);

      for (const topic of requestedTopics) {
        if (await canSubscribe(userId, topic)) {
          allowedTopics.add(topic as RealtimeTopic);
        }
      }

      wsServer.handleUpgrade(req, socket, head, (websocket) => {
        const typedSocket = websocket as HubSocket;
        typedSocket.userId = userId;

        for (const topic of allowedTopics) {
          subscribeSocket(typedSocket, topic);
        }

        wsServer.emit("connection", typedSocket, req);
      });
    } catch {
      socket.destroy();
    }
  });

  const heartbeat = setInterval(() => {
    for (const socket of wsServer.clients) {
      const typedSocket = socket as HubSocket;

      if (typedSocket.isAlive === false) {
        typedSocket.terminate();
        unsubscribeSocket(typedSocket);
        continue;
      }

      typedSocket.isAlive = false;
      typedSocket.ping();
    }
  }, 30000);

  wsServer.on("close", () => {
    clearInterval(heartbeat);
  });

  return wsServer;
}

export function publishRealtimeEvent(topics: RealtimeTopic[], payload: Omit<RealtimePayload, "at">) {
  if (topics.length === 0) return;

  const hub = getRealtimeHub();

  for (const topic of topics) {
    broadcastToTopic(topic, payload);
  }
}

function broadcastToTopic(
  topic: RealtimeTopic,
  payload: Omit<RealtimePayload, "at">,
  exceptSocket?: HubSocket,
) {
  const hub = getRealtimeHub();
  const channel = hub.channels.get(topic);
  if (!channel) return;

  const message = JSON.stringify({
    ...payload,
    at: Date.now(),
  } satisfies RealtimePayload);

  for (const socket of channel) {
    if (socket === exceptSocket || socket.readyState !== WebSocket.OPEN) {
      continue;
    }

    socket.send(message);
  }
}

export function userTopic(userId: string): RealtimeTopic {
  return `user:${userId}`;
}

export function conversationTopic(conversationId: string): RealtimeTopic {
  return `conversation:${conversationId}`;
}

export function groupTopic(groupId: string): RealtimeTopic {
  return `group:${groupId}`;
}

export function eventTopic(eventId: string): RealtimeTopic {
  return `event:${eventId}`;
}
