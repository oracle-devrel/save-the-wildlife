import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import * as dotenv from "dotenv";
import short from "short-uuid";
import pino from "pino";

dotenv.config({ path: "./config/.env" });
const logger = pino();

const serverId = short.generate();

const broadcastRefreshUpdate = process.env.BROADCAST_REFRESH_UPDATE || 50;

let players = {};

export function start(httpServer, port, pubClient, subClient) {
  const io = new Server(httpServer, {});

  io.adapter(createAdapter(pubClient, subClient));

  io.on("connection", (socket) => {
    logger.info(`New client added, ${io.engine.clientsCount} in total.`);

    Object.keys(players).forEach((id) => {
      socket.emit("player.new", {
        id,
        name: players[id].name,
        server: serverId,
      });
    });

    socket.on("player.trace", (player) => {
      const { id, ...others } = player;
      if (!players[id]) {
        io.emit("player.new", { id, name: others.name });
      }
      players[id] = { ...others, updated: new Date() };
    });

    socket.on("items.gen", ({ data }) => {
      const { trash, marineLife } = data;
      io.emit("items", { trash, marineLife });
    });

    socket.on("disconnect", (reason) => {
      logger.info(`Disconnect: ${reason}`);
    });
  });

  io.engine.on("connection_error", (err) => {
    logger.error(`ERROR ${err.code}: ${err.message}; ${err.context}`);
  });

  // broadcast all players data
  setInterval(() => {
    io.emit("allPlayers", players);
  }, broadcastRefreshUpdate);

  // Clean stale players, and send delete player if stale
  setInterval(() => {
    const now = new Date();
    const elapsedTimesById = Object.entries(players).map((e) => ({
      id: e[0],
      elapsed: now - e[1].updated,
    }));
    const staleIds = elapsedTimesById.filter((e) => e.elapsed > 250);
    staleIds.forEach((p) => {
      logger.info(`Stale player ${p.id} by ${p.elapsed}ms`);
      io.emit("player.delete", p.id);
      players[p.id] = undefined;
      delete players[p.id];
    });
  }, 2000);

  setInterval(
    () => logger.info(`${Object.keys(players).length} active players`),
    5000
  );

  httpServer.listen(port, () =>
    logger.info(`Server listening to port ${port}`)
  );
}
