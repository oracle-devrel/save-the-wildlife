#!/usr/bin/env zx
import { whichContainerEngine } from "./lib/container.mjs";
import { exitWithError } from "./lib/utils.mjs";

$.verbose = false;

const containerName = "redis_multiplayer";

const ce = await whichContainerEngine();

try {
  const { stdout, stderr, exitCode } = await $`${ce} stop ${containerName}`;
  if (exitCode == 0) {
    console.log(chalk.green(stdout.trim()));
  } else {
    exitWithError(stderr);
  }
} catch (error) {
  exitWithError(error.stderr);
}
