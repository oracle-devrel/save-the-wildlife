import { io } from "socket.io-client";
import * as dotenv from "dotenv";
import short from "shortid";
import pino from "pino";
import * as THREE from "three";
import { throttle } from "throttle-debounce";

dotenv.config({ path: "./config/.env" });
const logger = pino();

const NODE_ENV = process.env.NODE_ENV || "development";
logger.info(`NODE_ENV: ${NODE_ENV}`);

const TRACE_RATE_IN_MILLIS = parseInt(process.env.TRACE_RATE_IN_MILLIS) || 10;
logger.info(`TRACE_RATE_IN_MILLIS: ${TRACE_RATE_IN_MILLIS} ms`);

const yourId = short();
const yourName = `Bot ${yourId}`;
logger.info(`Name: ${yourName}`);

const BOUNDARY_WIDTH = parseInt(process.env.BOUNDARY_WIDTH) || 89;
const BOUNDARY_HEIGHT = parseInt(process.env.BOUNDARY_HEIGHT) || 23;
const boundaries = { width: BOUNDARY_WIDTH, height: BOUNDARY_HEIGHT };
logger.info(`Boundaries: ${JSON.stringify(boundaries)}`);

const WS_SERVER_SERVICE_HOST = process.env.WS_SERVER_SERVICE_HOST;
if (!WS_SERVER_SERVICE_HOST) {
  logger.error(`WS_SERVER_SERVICE_HOST not defined`);
  process.exit(1);
}
const WS_SERVER_SERVICE_PORT = process.env.WS_SERVER_SERVICE_PORT;
if (!WS_SERVER_SERVICE_PORT) {
  logger.error(`WS_SERVER_SERVICE_PORT not defined`);
  process.exit(1);
}

let items = {};
let players = {};

const logTrace = throttle(1000, (message) => logger.info(message));

const webSocketServerUrl = `ws://${WS_SERVER_SERVICE_HOST}:${WS_SERVER_SERVICE_PORT}`;
logger.info(`Connecting to WS Server on ${webSocketServerUrl}`);
const socket = io(webSocketServerUrl);

socket.on("server.info", (data) => {
  logger.info(`Server Info: ${JSON.stringify(data)}`);
});

socket.on("items.all", (data) => {
  // FIXME measure lag
  const itemIdToDestroy = data;
  delete items[itemIdToDestroy];
});

socket.on("item.new", (data) => {
  // FIXME measure lag
  items = data;
});

socket.on("item.destroy", (data) => {
  // FIXME measure lag
  items = data;
});

socket.on("player.trace.all", (data) => {
  // FIXME measure lag
  for (const [key, traceData] of Object.entries(data)) {
    players[key] = players[key] ? { ...players[key], ...traceData } : traceData;
  }
});

socket.on("player.info.joined", (data) => {
  // FIXME measure lag
  const { id: joinedId, name: joinedName } = data;
  players[joinedId] = players[joinedId]
    ? { ...players[joinedId], name: joinedName }
    : { name: joinedName };
});

socket.on("player.info.left", (data) => {
  // FIXME measure lag
  const playerId = data;
  delete players[playerId];
});

socket.on("connect", () => {
  logger.info(`Connected to ${webSocketServerUrl}`);
});

socket.on("disconnect", () => {
  logger.info(`Disconnected from ${webSocketServerUrl}`);
});

socket.on("error", (error) => {
  logger.error(error);
});

socket.emit("player.info.joining", { id: yourId, name: yourName });

const ACCELERATION = 0.005;
const BRAKE = 0.1;
const MAX_SPEED = 0.05;
const TURN_SPEED = Math.PI / 180;

const player = new THREE.Mesh();
let playerSpeed = 0;

let keyboard = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

setInterval(() => {
  animateBot();
  const { x, y } = player.position;
  const { z: rotZ } = player.rotation;
  const trace = {
    id: yourId,
    x: x.toFixed(5),
    y: y.toFixed(5),
    rotZ: rotZ.toFixed(5), // add rotation Z value
  };
  logTrace(`Trace: ${JSON.stringify(trace)}`);
  socket.emit("player.trace.change", trace);
}, TRACE_RATE_IN_MILLIS);

setInterval(() => {
  keyboard["ArrowUp"] = true;
  setTimeout(() => {
    keyboard["ArrowUp"] = false;
  }, 300);
}, 3 * 1000);

setInterval(() => {
  keyboard["ArrowLeft"] = true;
  setTimeout(() => {
    keyboard["ArrowLeft"] = false;
  }, 300);
}, 3 * 1000);

function animateBot() {
  let movement = new THREE.Vector3(0, 0, 0);

  if (keyboard["ArrowUp"]) {
    playerSpeed += ACCELERATION;
  } else if (keyboard["ArrowDown"]) {
    playerSpeed -= BRAKE;
  } else {
    playerSpeed *= 0.98; // Decelerate if no acceleration or braking input
  }

  playerSpeed = Math.max(Math.min(playerSpeed, MAX_SPEED), -MAX_SPEED);

  if (keyboard["ArrowLeft"]) {
    player.rotation.z += TURN_SPEED;
  }
  if (keyboard["ArrowRight"]) {
    player.rotation.z -= TURN_SPEED;
  }

  const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(
    player.quaternion
  );

  movement.copy(direction).multiplyScalar(playerSpeed);

  player.position.add(movement);
}

async function terminate() {
  await socket.close();
  process.exit(0);
}

process.on("SIGTERM", async () => {
  await terminate();
});

process.on("SIGINT", async () => {
  await terminate();
});
