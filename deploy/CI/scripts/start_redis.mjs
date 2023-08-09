#!/usr/bin/env zx

import { exitWithError } from "./lib/utils.mjs";
import { whichContainerEngine } from "./lib/container.mjs";

const shell = process.env.SHELL | "/bin/zsh";
$.shell = shell;
$.verbose = false;

const containerName = "redis_multiplayer";

const ce = await whichContainerEngine();

if (!process.env.REDIS_PASSWORD) {
  await question("REDIS_PASSWORD: ");
}
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

try {
  const { stdout, stderr, exitCode } = await $`${ce} \
    run --name ${containerName} \
    -d \
    --rm \
    -p 6379:6379 \
    -e REDIS_PASSWORD="${REDIS_PASSWORD}" \
    redis \
    /bin/sh -c 'redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}'`;
  if (exitCode == 0) {
    console.log(chalk.green(stdout.trim()));
  } else {
    exitWithError(stderr);
  }
} catch (error) {
  exitWithError(error.stderr);
}
