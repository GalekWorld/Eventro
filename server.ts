import { createServer } from "http";
import next from "next";
import { installRealtimeServer } from "./src/lib/realtime";

const mode = process.argv[2] === "start" ? "production" : "development";
const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = env.NODE_ENV ?? mode;

const dev = env.NODE_ENV !== "production";
const hostname = env.HOST ?? "0.0.0.0";
const port = Number(env.PORT ?? 3000);

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();
  const upgradeHandler = typeof app.getUpgradeHandler === "function" ? app.getUpgradeHandler() : undefined;

  const server = createServer((req, res) => {
    handle(req, res);
  });

  await installRealtimeServer(server, upgradeHandler);

  server.listen(port, hostname, () => {
    console.log(`Eventro listo en http://${hostname}:${port}`);
  });
}

main().catch((error) => {
  console.error("SERVER_START_ERROR", error);
  process.exit(1);
});
