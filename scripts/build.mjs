#!/usr/bin/env zx
import { getNpmVersion } from "./lib/npm.mjs";
import { getNamespace, getRegionByName } from "./lib/oci.mjs";
import { checkPodmanMachineRunning, buildImage } from "./lib/container.mjs";
import { getVersionGradle } from "./lib/gradle.mjs";

const shell = process.env.SHELL | "/bin/zsh";
$.shell = shell;
$.verbose = false;

checkPodmanMachineRunning();

const namespace = await getNamespace();
const ociRegionNameFromEnv = (await $`echo $OCI_REGION`).stdout.trim();
const region = await getRegionByName(ociRegionNameFromEnv);
const regionKey = region["region-key"].toLowerCase();
console.log({ namespace, regionKey });

const { a, _ } = argv;
const [action] = _;

if (action === "ws-server") {
  await releaseNpm("server");
  process.exit(0);
}

if (action === "web") {
  await releaseNpm("web");
  process.exit(0);
}

if (action === "score") {
  await releaseGradle("score");
  process.exit(0);
}

if (a || action === "all") {
  await releaseNpm("server");
  await releaseNpm("web");
  await releaseGradle("score");
  process.exit(0);
}

console.log("Usage:");
console.log("\tnpx zx scripts/build.mjs all");
console.log("\tnpx zx scripts/build.mjs -a");
console.log("\tnpx zx scripts/build.mjs ws-server");
console.log("\tnpx zx scripts/build.mjs web");
console.log("\tnpx zx scripts/build.mjs score");

async function releaseNpm(service) {
  await cd(`${service}`);
  const currentVersion = await getNpmVersion();
  console.log(`Releasing ${service}:${currentVersion})`);
  await buildImage(`${service}`, currentVersion);
  await cd("..");
}

async function releaseGradle(service) {
  await cd(`${service}`);
  const currentVersion = await getVersionGradle();
  console.log(`Releasing ${service}:${currentVersion})`);
  await buildImage(`${service}`, currentVersion);
  await cd("..");
}
