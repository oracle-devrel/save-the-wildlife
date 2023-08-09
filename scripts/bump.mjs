#!/usr/bin/env zx
import {
  getVersion,
  validateBumpLevel,
  readEnvJson,
  writeEnvJson,
} from "./lib/utils.mjs";
import { bump } from "./lib/npm.mjs";
import { bumpGradle, getVersionGradle } from "./lib/gradle.mjs";

const shell = process.env.SHELL | "/bin/zsh";
$.shell = shell;
$.verbose = false;

let properties = await readEnvJson();

const { _ } = argv;
const [action] = _;

if (action === "web") {
  await bumpVersion("web");
  process.exit(0);
}

if (action === "server") {
  await bumpVersion("server");
  process.exit(0);
}

if (action === "score") {
  await bumpVersionJava("score");
  process.exit(0);
}

console.log("Usage:");
console.log("\tnpx zx scripts/bump.mjs web");
console.log("\tnpx zx scripts/bump.mjs server");
console.log("\tnpx zx scripts/bump.mjs score");

async function bumpVersion(service) {
  await cd(service);
  const currentVersion = await getVersion();
  let levelAnswer = await question(
    "Release level [major,minor,patch] (patch default): "
  );
  const level = await validateBumpLevel(levelAnswer || "patch");
  const newVersion = await bump(level);
  console.log(
    `${chalk.yellow(service)} bumped from ${currentVersion} to ${chalk.yellow(
      newVersion
    )}`
  );
  properties[`${service}Version`] = newVersion.replace("v", "");
  await cd("..");
}

async function bumpVersionJava(service) {
  await cd(service);
  const currentVersion = await getVersionGradle();
  let levelAnswer = await question(
    "Release level [major,minor,patch] (patch default): "
  );
  const level = await validateBumpLevel(levelAnswer || "patch");
  const newVersion = await bumpGradle(level);
  console.log(
    `${chalk.yellow(service)} bumped from ${currentVersion} to ${chalk.yellow(
      newVersion
    )}`
  );
  properties[`${service}Version`] = newVersion.replace("v", "");
  await cd("..");
}

await writeEnvJson(properties);
