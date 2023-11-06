#!/usr/bin/env zx

import {
  checkRequiredProgramsExist,
  getVersion,
  getNamespace,
  setVariableFromEnvOrPrompt,
  writeEnvJson,
  generateRandomString,
  readEnvJson,
} from "./lib/utils.mjs";
import {
  getRegions,
  getTenancyId,
  searchCompartmentIdByName,
  listAdbDatabasesbyname,
} from "./lib/oci.mjs";
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

let properties = await readEnvJson();

const namespace = await getNamespace();
const tenancyId = await getTenancyId();
properties = { ...properties, ce, namespace, tenancyId };

await checkDependencies();

await createCerts();

await loginContainerRegistry();

await redisDetails();

await adbDetails();

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

  const certPath = "./deploy/k8s/base/ingress/.certs";
  const prevKeyExists = await fs.pathExists(path.join(certPath, "tls.key"));
  if (prevKeyExists) {
    console.log(`${chalk.yellow("Existing key pair ")} on ${certPath}.`);
  } else {
    await createSelfSignedCert(certPath);
  }
  properties = { ...properties, certPath };
  console.log();
}

async function loginContainerRegistry() {
  console.log("Login to container registry login...");

  await cd("deploy/vm/terraform");
  const { stdout } = await $`terraform output -json`;
  const terraformOutput = JSON.parse(stdout);
  const values = {};
  for (const [key, content] of Object.entries(terraformOutput)) {
    values[key] = content.value;
  }
  const { user_name: userName, user_auth_token: userAuthToken } = values;
  await cd("../../..");

  const regions = await getRegions();
  const regionNameValue = await setVariableFromEnvOrPrompt(
    "OCI_REGION",
    "OCI Region name",
    async () => printRegionNames(regions)
  );
  const { key: regionKey, name: regionName } = regions.find(
    (r) => r.name === regionNameValue
  );
  const containerRegistryURL = `${regionKey}.ocir.io`;

  properties = {
    ...properties,
    regionKey,
    regionName,
    containerRegistryURL,
    containerRegistryUser: userName,
    containerRegistryToken: userAuthToken,
  };

  await containerLogin(
    namespace,
    userName,
    userAuthToken,
    containerRegistryURL
  );
  console.log();
}

async function redisDetails() {
  const redisPassword = await generateRandomString();
  properties = { ...properties, redisPassword };
}

async function adbDetails() {
  const adbCompartmentName = await setVariableFromEnvOrPrompt(
    "ADB_COMPARTMENT_NAME",
    "Autonomous Database Compartment Name (root)"
  );

  const adbCompartmentId = await searchCompartmentIdByName(
    adbCompartmentName || "root"
  );

  const adbName = await setVariableFromEnvOrPrompt(
    "ADB_NAME",
    "Autonomous Database name"
  );

  const suggestedPassword = await generateRandomString();
  console.log(`Suggested Password: ${chalk.yellow(suggestedPassword)}`);

  const adbPassword = await setVariableFromEnvOrPrompt(
    "ADB_PASSWORD",
    "Autonomous Database password"
  );

  const adbDisplayName = await listAdbDatabasesbyname(adbName, adbCompartmentId);


  properties = {
    ...properties,
    adbCompartmentId,
    adbCompartmentName,
    adbName,
    adbPassword,
    adbDisplayName,
  };
//   console.log("Properties:", properties);

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
  console.log(`${chalk.yellow(`web\t\tv${webVersion}`)}`);
  await cd("..");
  await cd("./server");
  const serverVersion = await getVersion();
  await cd("..");
  console.log(`${chalk.yellow(`server\t\tv${serverVersion}`)}`);
  await cd("./score");
  const scoreVersion = await getVersionGradle();
  await cd("..");
  console.log(`${chalk.yellow(`score\t\tv${scoreVersion}`)}`);

  properties = { ...properties, webVersion, serverVersion, scoreVersion };
  console.log();
}

await writeEnvJson(properties);
