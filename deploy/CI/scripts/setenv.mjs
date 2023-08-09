#!/usr/bin/env zx

import {
  checkRequiredProgramsExist,
  getVersion,
  getNamespace,
  setVariableFromEnvOrPrompt,
} from "./lib/utils.mjs";
import { getRegions } from "./lib/oci.mjs";
import { createSelfSignedCert } from "./lib/tls.mjs";
import {
  containerLogin,
  whichContainerEngine,
  checkPodmanMachineRunning,
} from "./lib/container.mjs";
import { getVersionGradle } from "./lib/gradle.mjs";

const shell = process.env.SHELL | "/bin/zsh";
$.shell = shell;
$.verbose = false;

const ce = await whichContainerEngine();
console.log(`Using ${chalk.yellow(ce)} as container engine.`);
console.log();

await checkDependencies();

await createCerts();

await loginContainerRegistry();

await printVersions();

async function checkDependencies() {
  console.log("Check dependencies...");
  const dependencies = ["git", "node", "openssl", "oci", "kubectl", ce];
  await checkRequiredProgramsExist(dependencies);
  ce === "podman" && (await checkPodmanMachineRunning());
  console.log();
}

async function createCerts() {
  console.log("Generate Self signed certs...");

  const shell = process.env.SHELL | "/bin/zsh";
  $.shell = shell;
  $.verbose = false;

  const certPath = "./deploy/k8s/base/ingress/.certs";
  const prevKeyExists = await fs.pathExists(path.join(certPath, "tls.key"));
  if (prevKeyExists) {
    console.log(
      `${chalk.yellow("Existing key pair ")} on ${certPath}. ${chalk.red(
        "Key pair not generated"
      )}.`
    );
  } else {
    await createSelfSignedCert(certPath);
  }
  console.log();
}

async function loginContainerRegistry() {
  console.log("Login to container registry login...");
  const namespace = await getNamespace();

  const user = await setVariableFromEnvOrPrompt(
    "OCI_OCIR_USER",
    "OCI Username (usually an email)"
  );

  const token = await setVariableFromEnvOrPrompt(
    "OCI_OCIR_TOKEN",
    "OCI Auth Token for OCI Registry"
  );

  const regions = await getRegions();
  const regionName = await setVariableFromEnvOrPrompt(
    "OCI_REGION",
    "OCI Region name",
    async () => printRegionNames(regions)
  );
  const { key } = regions.find((r) => r.name === regionName);
  const url = `${key}.ocir.io`;

  await containerLogin(namespace, user, token, url);
  console.log();
}

async function printRegionNames(regions) {
  const regionNames = regions.map((r) => r.name);
  const zones = [...new Set(regionNames.map((name) => name.split("-")[0]))];
  const regionsByZone = regions.reduce((acc, cur) => {
    const zone = cur.name.split("-")[0];
    if (acc[zone]) {
      acc[zone].push(cur.name);
    } else {
      acc[zone] = [cur.name];
    }
    return acc;
  }, {});
  Object.keys(regionsByZone).forEach((zone) =>
    console.log(`\t${chalk.yellow(zone)}: ${regionsByZone[zone].join(", ")}`)
  );
}

async function printVersions() {
  await cd("./web");
  const webVersion = await getVersion();
  console.log(`${chalk.yellow(`web\tv${webVersion}`)}`);
  await cd("..");
  await cd("./server");
  const serverVersion = await getVersion();
  await cd("..");
  console.log(`${chalk.yellow(`server\tv${serverVersion}`)}`);
  await cd("./score");
  const scoreVersion = await getVersionGradle();
  await cd("..");
  console.log(`${chalk.yellow(`score\tv${scoreVersion}`)}`);
  console.log();
}
