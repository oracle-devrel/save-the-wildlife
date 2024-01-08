#!/usr/bin/env zx
import { getVersion, readEnvJson } from "./lib/utils.mjs";
import { build_image, tagImage, pushImage } from "./lib/container.mjs";
import { buildWeb } from "./lib/npm.mjs";
import {
  buildJarGradle,
  cleanGradle,
  getVersionGradle,
} from "./lib/gradle.mjs";

const shell = process.env.SHELL | "/bin/zsh";
$.shell = shell;
$.verbose = false;

let properties = await readEnvJson();
const { containerRegistryURL, namespace } = properties;

const { a, _ } = argv;
const [action] = _;

const project = "save-the-wildlife";

if (action === "web") {
  await releaseNpm("web");
  process.exit(0);
}

if (action === "server") {
  await releaseNpm("server");
  process.exit(0);
}

if (action === "score") {
  await releaseGradle("score");
  process.exit(0);
}

if (a || action === "all") {
  await releaseNpm("web");
  await releaseNpm("server");
  await releaseGradle("score");
  process.exit(0);
}

console.log("Usage:");
console.log("\tnpx zx scripts/release.mjs all");
console.log("\tnpx zx scripts/release.mjs -a");
console.log("\tnpx zx scripts/release.mjs web");
console.log("\tnpx zx scripts/release.mjs server");
console.log("\tnpx zx scripts/release.mjs score");

async function releaseNpm(service) {
  await cd(service);
  const currentVersion = await getVersion();
  console.log(`Releasing ${service}:${currentVersion}`);
  if (service === "web") {
    await buildWeb();
  }
  const image_name = `${project}/${service}`;
  await build_image(`localhost/${image_name}`, currentVersion);
  const local_image = `localhost/${image_name}:${currentVersion}`;
  const remote_image = `${containerRegistryURL}/${namespace}/${image_name}:${currentVersion}`;
  await tagImage(local_image, remote_image);
  await pushImage(remote_image);
  console.log(`Released: ${chalk.yellow(remote_image)}`);
  await cd("..");
}
async function releaseGradle(service) {
  await cd(service);
  await cleanGradle();
  await buildJarGradle();
  const currentVersion = await getVersionGradle();
  console.log(`Releasing ${service}:${currentVersion}`);
  const image_name = `${project}/${service}`;
  await build_image(`localhost/${image_name}`, currentVersion);
  const local_image = `localhost/${image_name}:${currentVersion}`;
  const remote_image = `${containerRegistryURL}/${namespace}/${image_name}:${currentVersion}`;
  await tagImage(local_image, remote_image);
  await pushImage(remote_image);
  console.log(`Released: ${chalk.yellow(remote_image)}`);
  await cd("..");
}
