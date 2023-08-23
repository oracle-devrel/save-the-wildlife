import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import * as dotenv from "dotenv";
import short from "short-uuid";
import pino from "pino";
import { deleteCurrentScore, postCurrentScore } from "./score.js";
import pkg from "./package.json" assert { type: "json" };

dotenv.config({ path: "./config/.env" });

const isProduction = process.env.NODE_ENV === "production";
const logger = pino({ level: isProduction ? "warn" : "debug" });

const version = pkg.version;
logger.info(`Server version ${version}`);
const serverId = short.generate();
logger.info(`Server ${serverId}`);

const ENABLE_COHERENCE_BACKEND =
  process.env.ENABLE_COHERENCE_BACKEND === "true";

const BROADCAST_REFRESH_UPDATE = process.env.BROADCAST_REFRESH_UPDATE
  ? parseInt(process.env.BROADCAST_REFRESH_UPDATE)
  : 50;

const CLEANUP_STALE_IN_SECONDS = process.env.CLEANUP_STALE_IN_SECONDS
  ? parseInt(process.env.CLEANUP_STALE_IN_SECONDS)
  : 2;
const BROADCAST_ITEMS_IN_SECONDS = process.env.BROADCAST_ITEMS_IN_SECONDS
  ? parseInt(process.env.BROADCAST_ITEMS_IN_SECONDS)
  : 2;

const ITEM_MAX_SIZE = process.env.ITEM_MAX_SIZE
  ? parseFloat(process.env.ITEM_MAX_SIZE)
  : 0.9;
const ITEM_MIN_SIZE = process.env.ITEM_MIN_SIZE
  ? parseFloat(process.env.ITEM_MIN_SIZE)
  : 0.5;

const WORLD_SIZE_X = process.env.WORLD_SIZE_X
  ? parseInt(process.env.WORLD_SIZE_X)
  : 88;
const WORLD_SIZE_Z = process.env.WORLD_SIZE_Z
  ? parseInt(process.env.WORLD_SIZE_Z)
  : 22;

const GAME_DURATION_IN_SECONDS = process.env.GAME_DURATION_IN_SECONDS
  ? parseInt(process.env.GAME_DURATION_IN_SECONDS)
  : 180;

let mapPlayersTraces;
let mapPlayersInfo;
let mapTrash;
let mapMarineLife;

export async function start(
  httpServer,
  port,
  cacheSession,
  pubClient,
  subClient
) {
  const io = new Server(httpServer, {});

  if (pubClient && subClient) {
    io.adapter(createAdapter(pubClient, subClient));
  }

  if (ENABLE_COHERENCE_BACKEND) {
    mapPlayersTraces = await cacheSession.getMap("playerTraces");
    mapPlayersInfo = await cacheSession.getMap("playersInfo");
    mapTrash = await cacheSession.getMap("trash");
    mapMarineLife = await cacheSession.getMap("marineLife");
  } else {
    mapPlayersTraces = {};
    mapPlayersInfo = {};
    mapTrash = {};
    mapMarineLife = {};
  }

  io.on("connection", async (socket) => {
    let playerIdForSocket;

    socket.emit("server.info", {
      id: serverId,
      version: version,
      gameDuration: GAME_DURATION_IN_SECONDS,
      worldSizeX: WORLD_SIZE_X,
      worldSizeZ: WORLD_SIZE_Z,
    });

    const trashFromCache = ENABLE_COHERENCE_BACKEND
      ? await readCacheEntries(mapTrash)
      : mapTrash;
    const marineLifeFromCache = ENABLE_COHERENCE_BACKEND
      ? await readCacheEntries(mapMarineLife)
      : mapMarineLife;
    socket.emit("items.all", { ...trashFromCache, ...marineLifeFromCache });

    // FIXME scope this to surrounding players only
    socket.emit(
      "player.info.all",
      ENABLE_COHERENCE_BACKEND
        ? await readCacheEntries(mapPlayersInfo)
        : mapPlayersInfo
    );

    // FIXME send random starting position
    socket.emit("game.on", {});

    socket.on("player.info.joining", async ({ id, name }) => {
      if (ENABLE_COHERENCE_BACKEND) {
        await writeCache(mapPlayersInfo, id, { name });
      } else {
        mapPlayersInfo[id] = { name };
      }
    });

    socket.on("game.start", async ({ playerId, playerName }) => {
      playerIdForSocket = playerId;
      const body = { name: playerName };
      if (ENABLE_COHERENCE_BACKEND) {
        await writeCache(mapPlayersInfo, playerId, body);
      } else {
        mapPlayersInfo[playerId] = body;
      }
      io.emit("player.info.joined", {
        id: playerId,
        name: playerName,
      });

      setTimeout(async () => {
        socket.emit("game.end", { playerId });
        io.emit("player.info.left", playerId);
        if (ENABLE_COHERENCE_BACKEND) {
          await deleteCache(mapPlayersTraces, playerId);
          await deleteCache(mapPlayersInfo, playerId);
        } else {
          delete mapPlayersTraces[playerId];
          delete mapPlayersInfo[playerId];
        }
        await deleteCurrentScore(playerId);
        playerIdForSocket = undefined;
      }, GAME_DURATION_IN_SECONDS * 1000);
    });

    socket.on("player.trace.change", async ({ id, ...traceData }) => {
      const body = { ...traceData, updated: new Date() };
      if (ENABLE_COHERENCE_BACKEND) {
        await writeCache(mapPlayersTraces, id, body);
      } else {
        mapPlayersTraces[id] = body;
      }
    });

    socket.on("items.collision", async ({ itemId, playerId, playerName }) => {
      const existTrash = ENABLE_COHERENCE_BACKEND
        ? await mapTrash.has(itemId)
        : mapTrash[itemId];
      const existMarineLife = ENABLE_COHERENCE_BACKEND
        ? await mapMarineLife.has(itemId)
        : mapMarineLife[itemId];
      if (existTrash) {
        ENABLE_COHERENCE_BACKEND
          ? await deleteCache(mapTrash, itemId)
          : delete mapTrash[itemId];
        io.emit("item.destroy", itemId);
        const jsonResponse = await postCurrentScore(
          playerId,
          playerName,
          "INCREMENT"
        );
      } else if (existMarineLife) {
        ENABLE_COHERENCE_BACKEND
          ? await deleteCache(mapMarineLife, itemId)
          : delete mapMarineLife[itemId];
        io.emit("item.destroy", itemId);
        const jsonResponse = await postCurrentScore(
          playerId,
          playerName,
          "DECREMENT"
        );
      }
    });

    socket.on("disconnect", async (reason) => {
      io.emit("player.info.left", playerIdForSocket);
      if (ENABLE_COHERENCE_BACKEND) {
        await deleteCache(mapPlayersTraces, playerIdForSocket);
        await deleteCache(mapPlayersInfo, playerIdForSocket);
      } else {
        delete mapPlayersTraces[playerIdForSocket];
        delete mapPlayersInfo[playerIdForSocket];
      }
      logger.info(`${playerIdForSocket} disconnected because ${reason}`);
      playerIdForSocket = undefined;
    });
  });

  io.engine.on("connection_error", async (err) => {
    logger.error(`ERROR ${err.code}: ${err.message}; ${err.context}`);
  });

  // broadcast all players traces
  setInterval(async () => {
    // FIXME scope this to surrounding players only
    const traces = ENABLE_COHERENCE_BACKEND
      ? await readCacheEntries(mapPlayersTraces)
      : mapPlayersTraces;
    io.emit("player.trace.all", traces);
  }, BROADCAST_REFRESH_UPDATE);

  // refresh items
  setInterval(async () => {
    const numberOfPlayers = ENABLE_COHERENCE_BACKEND
      ? await mapPlayersInfo.size
      : Object.keys(mapPlayersInfo).length;
    const numberOfTrash = ENABLE_COHERENCE_BACKEND
      ? await mapTrash.size
      : Object.keys(mapTrash).length;
    const numberOfMarineLife = ENABLE_COHERENCE_BACKEND
      ? await mapMarineLife.size
      : Object.keys(mapMarineLife).length;
    const deltaOfDesiredNumberOfTrash = numberOfPlayers - numberOfTrash;
    const deltaOfDesiredNumberOfMarineLife =
      numberOfPlayers * 2 - numberOfMarineLife;
    const extraTrashPoll = {};
    for (let index = 0; index < deltaOfDesiredNumberOfTrash; index++) {
      const { id, ...trashData } = createObject("trash");
      extraTrashPoll[id] = trashData;
      io.emit("item.new", { id, data: extraTrashPoll[id] });
    }
    Object.keys(extraTrashPoll).forEach(async (key) => {
      ENABLE_COHERENCE_BACKEND
        ? await writeCache(mapTrash, key, extraTrashPoll[key])
        : (mapTrash[key] = extraTrashPoll[key]);
    });
    const extraMarineLifePoll = {};
    for (let index = 0; index < deltaOfDesiredNumberOfMarineLife; index++) {
      const { id, ...marineLifeData } = createObject("turtle");
      extraMarineLifePoll[id] = marineLifeData;
      io.emit("item.new", { id, data: extraMarineLifePoll[id] });
    }
    Object.keys(extraMarineLifePoll).forEach(async (key) =>
      ENABLE_COHERENCE_BACKEND
        ? await writeCache(mapMarineLife, key, extraMarineLifePoll[key])
        : (mapMarineLife[key] = extraMarineLifePoll[key])
    );
  }, BROADCAST_ITEMS_IN_SECONDS * 1000);

  function createObject(type) {
    const x = Math.round((Math.random() - 0.5) * (WORLD_SIZE_X - 1));
    const y = 0;
    const z = Math.round((Math.random() - 0.5) * (WORLD_SIZE_Z - 1));
    const size = (
      Math.random() * (ITEM_MAX_SIZE - ITEM_MIN_SIZE) +
      ITEM_MIN_SIZE
    ).toFixed(2);
    return { id: short.generate(), type, position: { x, y, z }, size };
  }

  // Clean stale players, and send delete player if stale
  setInterval(async () => {
    const now = new Date();
    // FIXME can we delete them without adding elapsed to all of them?
    // FIXME can we use TTL from Coherence
    // FIXME do we need clean up stales to begin with?
    const traces = ENABLE_COHERENCE_BACKEND
      ? await readCacheEntries(mapPlayersTraces)
      : mapPlayersTraces;
    const elapsedTimesById = Object.entries(traces).map((player) => ({
      id: player[0],
      elapsed: now - player[1].updated,
    }));
    const staleIds = elapsedTimesById.filter((e) => e.elapsed > 250);
    staleIds.forEach(async (p) => {
      logger.info(`Stale player ${p.id} by ${p.elapsed}ms`);
      if (ENABLE_COHERENCE_BACKEND) {
        await deleteCache(mapPlayersTraces, p.id);
        await deleteCache(mapPlayersInfo, p.id);
      } else {
        delete mapPlayersTraces[p.id];
        delete mapPlayersInfo[p.id];
      }
      io.emit("player.info.left", p.id);
    });
  }, CLEANUP_STALE_IN_SECONDS * 1000);

  setInterval(async () => {
    const numPlayers = ENABLE_COHERENCE_BACKEND
      ? await mapPlayersInfo.size
      : Object.keys(mapPlayersInfo).length;
    const numTrash = ENABLE_COHERENCE_BACKEND
      ? await mapTrash.size
      : Object.keys(mapTrash).length;
    const numMarineLife = ENABLE_COHERENCE_BACKEND
      ? await mapMarineLife.size
      : Object.keys(mapMarineLife).length;
    logger.info(
      `${numPlayers} Players, ${numTrash} Trash items and ${numMarineLife} Marine Life`
    );
  }, 5000);

  httpServer.listen(port, () =>
    logger.info(`Server listening to port ${port}`)
  );
}

async function writeCache(cache, id, value) {
  try {
    await cache.set(id, value);
  } catch (error) {
    logger.error(
      `Error writing ${id}: ${JSON.stringify(value)}. ${error.message}`
    );
  }
}

async function readCache(cache, id) {
  try {
    return await cache.get(id);
  } catch (error) {
    logger.error(`Error reading ${id}. ${error.message}`);
  }
}

async function deleteCache(cache, id) {
  if (!id) return;
  try {
    await cache.delete(id);
  } catch (error) {
    logger.error(`Error deleting ${id}. ${error.message}`);
  }
}

async function readCacheEntries(cache) {
  try {
    const response = await cache.entries();
    let data = {};
    for await (const entry of response) {
      data[entry.key] = entry.value;
    }
    return data;
  } catch (error) {
    logger.error(`Error reading all entries. ${error.message}`);
  }
}
