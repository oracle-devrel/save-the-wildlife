import { createServer } from "http";
import express from "express";
import { createClient } from "redis";
import { Session, Options } from "@oracle/coherence";
import { createTerminus } from "@godaddy/terminus";
import pino from "pino";
import * as dotenv from "dotenv";
import { start } from "./server.js";

dotenv.config({ path: "./config/.env" });

const port = process.env.PORT | 3000;
const isProduction = process.env.NODE_ENV === "production";
const logger = pino({ level: isProduction ? "warn" : "debug" });

logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);

const app = express();
const httpServer = createServer(app);

let pubClient;
let subClient;
let cacheSession;

// FIXME Flag to use coherence
const ENABLE_COHERENCE_BACKEND = process.env.ENABLE_COHERENCE_BACKEND === "true";

// FIXME coherence security, probably TLS, password would be easier to begin with
const COHERENCE_SERVICE_HOST = process.env.COHERENCE_SERVICE_HOST
  ? process.env.COHERENCE_SERVICE_HOST
  : "localhost";

const COHERENCE_SERVICE_PORT = process.env.COHERENCE_SERVICE_PORT
  ? parseInt(process.env.COHERENCE_SERVICE_PORT)
  : 1408;

const coherenceAddress = `${COHERENCE_SERVICE_HOST}:${COHERENCE_SERVICE_PORT}`;
logger.info(`Coherence URL: ${coherenceAddress}`);

const ENABLE_REDIS_BACKEND = process.env.ENABLE_REDIS_BACKEND === "true";

if (ENABLE_REDIS_BACKEND) {
  const REDIS_SERVICE_HOST = process.env.REDIS_SERVICE_HOST
    ? process.env.REDIS_SERVICE_HOST
    : "localhost";

  const REDIS_SERVICE_PORT = process.env.REDIS_SERVICE_PORT
    ? parseInt(process.env.REDIS_SERVICE_PORT)
    : 6379;

  const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
  if (!REDIS_PASSWORD) {
    logger.error(`REDIS_PASSWORD is not declared`);
    process.exit(1);
  }

  const REDIS_URL = `redis://default:${REDIS_PASSWORD}@${REDIS_SERVICE_HOST}:${REDIS_SERVICE_PORT}`;
  const REDIS_URL_OBFUSCATED = `redis://default:*******@${REDIS_SERVICE_HOST}:${REDIS_SERVICE_PORT}`;
  logger.info(`Redis URL: ${REDIS_URL_OBFUSCATED}`);

  pubClient = createClient({
    url: REDIS_URL,
  });
  subClient = pubClient.duplicate();
  pubClient.on("error", (err) =>
    logger.error(`Redis Pub Client Error: ${err}`)
  );
  subClient.on("error", (err) =>
    logger.error(`Redis Sub Client Error: ${err}`)
  );

  Promise.all([
    pubClient.connect(),
    subClient.connect(),
    createCacheSession(),
  ]).then(async () => {
    start(httpServer, port, cacheSession, pubClient, subClient);
  });
} else {
  createCacheSession().then(() => { start(httpServer, port, cacheSession)});
}

function onSignal() {
  logger.info("Server cleaning up");
  if (ENABLE_REDIS_BACKEND) {
    if (pubClient) pubClient.quit();
    if (subClient) subClient.quit();
  }
  if (cacheSession) cacheSession.close();
}

async function onHealthCheck() {
  const responseStatus = {
    redis: { status: "disabled" },
    coherence: { status: "disabled" },
  };
  if (ENABLE_REDIS_BACKEND) {
    try {
      const redisOk = (await pubClient.ping()) === "PONG";
      if (!redisOk) {
        responseStatus.redis.status = "Connection error";
        return Promise.reject(responseStatus);
      }
      responseStatus.redis.status = "OK";
    } catch (error) {
      responseStatus.redis.status = "Connection error";
      return Promise.reject(responseStatus);
    }
  }
  if (ENABLE_COHERENCE_BACKEND) {
    try {
      const coherenceStatusOk = await cacheSession.callOptions();
      if (!coherenceStatusOk) {
        responseStatus.coherence.status = "Connection error";
        return Promise.reject(responseStatus);
      }
      responseStatus.coherence.status = "OK";
    } catch (error) {
      responseStatus.coherence.status = "Connection error";
      return Promise.reject(responseStatus);
    }
  }
  return Promise.resolve(responseStatus);
}

createTerminus(httpServer, {
  signal: "SIGINT",
  healthChecks: { "/healthz": onHealthCheck },
  onSignal,
});

async function createCacheSession() {
  return new Promise((resolve, reject) => {
    try {
      const opts = new Options();
      opts.address = coherenceAddress;
      cacheSession = new Session(opts);
      resolve(cacheSession);
    } catch (err) {
      logger.error(err.message);
      reject(err.message);
    }
  });
}
