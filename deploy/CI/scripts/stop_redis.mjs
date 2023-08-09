#!/usr/bin/env zx
import { whichContainerEngine } from "./lib/container.mjs";
import { exitWithError } from "./lib/utils.mjs";

const shell = process.env.SHELL | "/bin/zsh";
$.shell = shell;
$.verbose = false;

const ce = await whichContainerEngine();

try {
  const { stdout, stderr, exitCode } = await $`${ce} stop redis_multiplayer`;
  if (exitCode == 0) {
    console.log(chalk.green(stdout.trim()));
  } else {
    exitWithError(stderr);
  }
} catch (error) {
  exitWithError(error.stderr);
}

try {
  const { stdout, stderr, exitCode } = await $`${ce} rm redis_multiplayer`;
  if (exitCode == 0) {
    console.log(chalk.green(stdout.trim()));
  } else {
    exitWithError(stderr);
  }
} catch (error) {
  exitWithError(error.stderr);
}
