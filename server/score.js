import * as dotenv from "dotenv";
import fetch from "node-fetch";
import pino from "pino";

dotenv.config({ path: "../.config/.env" });
const isProduction = process.env.NODE_ENV === "production";
const logger = pino({ level: isProduction ? "warn" : "debug" });

let scoreFeatureFlag = true;
let scoreServiceUrl;

const SCORE_SERVICE_HOST = process.env.SCORE_SERVICE_HOST;
if (!SCORE_SERVICE_HOST) {
  logger.error(`SCORE_SERVICE_HOST not defined`);
  scoreFeatureFlag = false;
}
const SCORE_SERVICE_PORT = process.env.SCORE_SERVICE_PORT;
if (!SCORE_SERVICE_PORT) {
  scoreFeatureFlag = false;
  logger.error(`SCORE_SERVICE_PORT not defined`);
}

if (scoreFeatureFlag) {
  scoreServiceUrl = `${SCORE_SERVICE_HOST}:${SCORE_SERVICE_PORT}`;
  logger.info({ scoreServiceUrl });
  logger.info(`Connecting to Score on ${scoreServiceUrl}`);
}

export async function postCurrentScore(playerId, playerName, operationType) {
  if (!scoreFeatureFlag) return;
  try {
    const stringifyBody = JSON.stringify({
      operationType: operationType,
      name: playerName,
    });
    // FIXME thrown exceptions will kill the process!
    const urlRequest = `http://${scoreServiceUrl}/api/score/${playerId}`;
    await fetch(urlRequest, {
      method: "PUT",
      headers: { "Content-type": "application/json" },
      body: stringifyBody,
    });
  } catch (error) {
    logger.error(error.message);
    return { score: 0 };
  }
}

export async function deleteCurrentScore(playerId) {
  if (!scoreFeatureFlag) return;
  try {
    await fetch(`http://${scoreServiceUrl}/api/score/${playerId}`, {
      method: "DELETE",
      headers: { "Content-type": "application/json" },
    });
  } catch (error) {
    logger.error(error.message);
    return;
  }
}
