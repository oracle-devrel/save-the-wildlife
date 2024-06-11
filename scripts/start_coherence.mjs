#!/usr/bin/env zx

import { exitWithError } from "./lib/utils.mjs";
import { whichContainerEngine } from "./lib/container.mjs";

$.verbose = false;

const containerName = "coherence_multiplayer";

const ce = await whichContainerEngine();

// if (!process.env.REDIS_PASSWORD) {
//   await question("REDIS_PASSWORD: ");
// }
// const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

try {
  const { stdout, stderr, exitCode } = await $`${ce} \
    run --name ${containerName} \
    -d \
    --rm \
    -p 1408:1408 \
    ghcr.io/oracle/coherence-ce:23.03`;
  if (exitCode == 0) {
    console.log(chalk.green(stdout.trim()));
  } else {
    exitWithError(stderr);
  }
} catch (error) {
  exitWithError(error.stderr);
}
