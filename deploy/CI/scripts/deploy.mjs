#!/usr/bin/env zx

import {
  exitWithError,
  generateRandomString,
  getNamespace,
  setVariableFromEnvOrPrompt,
  printRegionNames,
} from "./lib/utils.mjs";
import {
  downloadAdbWallet,
  getRegions,
  listAdbDatabases,
  searchCompartmentIdByName,
} from "./lib/oci.mjs";

const shell = process.env.SHELL | "/bin/zsh";
$.shell = shell;
$.verbose = false;

const regions = await getRegions();
const regionName = await setVariableFromEnvOrPrompt(
  "OCI_REGION",
  "OCI Region name",
  () => printRegionNames(regions)
);
const { key } = regions.find((r) => r.name === regionName);
const url = `${key}.ocir.io`;

const adbCompartmentName = await setVariableFromEnvOrPrompt(
  "ADB_COMPARTMENT_NAME",
  "Autonomous Database Compartment Name"
);
const adbCompartmentId = await searchCompartmentIdByName(adbCompartmentName);

const adbName = await setVariableFromEnvOrPrompt(
  "ADB_NAME",
  "Autonomous Database name"
);
const adbPassword = await setVariableFromEnvOrPrompt(
  "ADB_PASSWORD",
  "Autonomous Database password"
);

const namespace = await getNamespace();

console.log(
  `Preparing deployment for ${chalk.yellow(url)} in namespace ${chalk.yellow(
    namespace
  )}`
);

await checkKubectlConfigured();

await createRegistrySecret();

await createConfigFiles();

console.log(`Ready to deploy.`);
console.log(
  `Run: ${chalk.yellow("kubectl apply -k deploy/k8s/overlays/prod")}`
);

async function checkKubectlConfigured() {
  console.log("Check kubectl is configured...");
  try {
    const { exitCode } = await $`kubectl cluster-info`;
    if (exitCode !== 0) {
      exitWithError("kubectl not configured");
    } else {
      console.log(`${chalk.green("[ok]")} kubectl connects to cluster`);
    }
  } catch (error) {
    exitWithError(error.stderr);
  }
  console.log();
}
async function createRegistrySecret() {
  console.log("Create registry secret on Kubernetes cluster...");
  try {
    const user = await setVariableFromEnvOrPrompt(
      "OCI_OCIR_USER",
      "OCI Username (usually an email)"
    );

    const token = await setVariableFromEnvOrPrompt(
      "OCI_OCIR_TOKEN",
      "OCI Auth Token for OCI Registry"
    );
    await cleanRegisterSecret();
    const { exitCode, stdout } =
      await $`kubectl create secret docker-registry ocir-secret --docker-server=${url} --docker-username=${namespace}/${user} --docker-password=${token} --docker-email=${user}`;
    if (exitCode !== 0) {
      exitWithError("docker-registry secret not created");
    } else {
      console.log(`${chalk.green("[ok]")} ${stdout}`);
    }
  } catch (error) {
    exitWithError(error.stderr);
  }
  console.log();
}

async function createConfigFiles() {
  console.log("Create config files...");
  const redis_password = await generateRandomString();
  await createRedisConfig(redis_password);
  await createKustomizationYaml(key, namespace);
  await createDBConfigFiles(
    adbCompartmentId,
    adbName,
    adbPassword,
    "./wallet.zip"
  );
  console.log();
}

async function createDBConfigFiles(
  adbCompartmentId,
  adbName,
  adbPassword,
  walletFilePath
) {
  await downloadWallet(adbCompartmentId, adbName, adbPassword, walletFilePath);
  await setScoreApplicationProperties(adbName, adbPassword);
  await $`mv wallet.zip deploy/k8s/base/score`;
}

async function setScoreApplicationProperties(adbName, adbPassword) {
  const pwdOutput = (await $`pwd`).stdout.trim();
  await cd(`${pwdOutput}/deploy/k8s/base/score`);
  try {
    let { stdout, exitCode, stderr } =
      await $`sed s/TEMPLATE_ADB_SERVICE/${adbName.toLowerCase()}_high/ application.properties.template | sed s/TEMPLATE_ADB_PASSWORD/${adbPassword}/ > application.properties`;
    if (exitCode !== 0) {
      exitWithError(`Error creating application.properties: ${stderr}`);
    }
    console.log(stdout);
    console.log(`Score ${chalk.green("application.properties")} created.`);
  } catch (error) {
    exitWithError(error.stderr);
  } finally {
    await cd(pwdOutput);
  }
}

async function downloadWallet(
  compartmentId,
  name,
  walletPassword,
  walletFilePath
) {
  const adbs = await listAdbDatabases(compartmentId);
  const adb = adbs.find(
    (db) => db["db-name"].toLowerCase() === name.toLowerCase()
  );
  await downloadAdbWallet(adb.id, walletFilePath, walletPassword);
}

async function createRedisConfig(password) {
  const pwdOutput = (await $`pwd`).stdout.trim();
  await cd("./deploy/k8s/base/ws-server");
  const replaceCmd = `s/MASTERPASSWORD/${password}/g`;
  try {
    let { exitCode: exitCodeConfig, stderr: stderrConfig } =
      await $`sed ${replaceCmd} redis.conf.template > redis.conf`;
    if (exitCodeConfig !== 0) {
      exitWithError(`Error creating redis.conf with password: ${stderrConfig}`);
    } else {
      console.log(`${chalk.green("redis.conf")} created.`);
    }
    let { exitCode: exitCodeEnv, stderr: stderrEnv } =
      await $`sed ${replaceCmd} env_server_template > .env_server`;
    if (exitCodeEnv !== 0) {
      exitWithError(`Error creating .env_server with password: ${stderrEnv}`);
    } else {
      console.log(`${chalk.green(".env_server")} created.`);
    }
  } catch (error) {
    exitWithError(error.stderr);
  } finally {
    await cd(pwdOutput);
  }
}

async function createKustomizationYaml(regionKey, namespace) {
  const pwdOutput = (await $`pwd`).stdout.trim();
  await cd("./deploy/k8s/overlays/prod");
  try {
    let { exitCode, stderr } =
      await $`sed 's/REGION_KEY/${regionKey}/' kustomization.yaml_template | sed 's/TENANCY_NAMESPACE/${namespace}/' > kustomization.yaml`;
    if (exitCode !== 0) {
      exitWithError(`Error creating kustomization.yaml: ${stderr}`);
    }
    console.log(`Overlay ${chalk.green("kustomization.yaml")} created.`);
  } catch (error) {
    exitWithError(error.stderr);
  } finally {
    await cd(pwdOutput);
  }
}

async function cleanRegisterSecret() {
  try {
    let { exitCode } = await $`kubectl get secret ocir-secret`;
    if (exitCode === 0) {
      console.log("Deleting exiting ocir-secret secret");
      await $`kubectl delete secret ocir-secret`;
    }
  } catch (error) {}
}
