#!/usr/bin/env zx

import { exitWithError, getVersion, readEnvJson } from "./lib/utils.mjs";
import { getVersionGradle } from "./lib/gradle.mjs";
import { downloadAdbWallet, listAdbDatabases } from "./lib/oci.mjs";

$.verbose = false;

const {
  containerRegistryURL,
  containerRegistryUser,
  containerRegistryToken,
  redisPassword,
  namespace,
  regionKey,
  adbCompartmentId,
  adbName,
  adbPassword,
} = await readEnvJson();

console.log(
  `Preparing deployment for ${chalk.yellow(
    containerRegistryURL
  )} in namespace ${chalk.yellow(namespace)}`
);

await checkKubectlConfigured();

await createRegistrySecret();

await createConfigFiles();

console.log(`Ready to deploy, run:`);
console.log(chalk.yellow("kubectl apply -k deploy/k8s/overlays/prod"));
console.log(
  `Get Load Balancer IP address with: ${chalk.yellow(
    "kubectl -n ingress-nginx get svc"
  )}`
);

async function checkKubectlConfigured() {
  console.log("Check kubectl is configured...");
  try {
    const { exitCode } = await $`kubectl cluster-info`;
    if (exitCode !== 0) {
      exitWithError("kubectl not configured");
    } else {
      console.log(`${chalk.green("[ok]")} kubectl connects to cluster`);
      const kubectlContext = (
        await $`kubectl config current-context`
      ).stdout.trim();
      console.log(`Context: ${chalk.green(kubectlContext)}`);
    }
  } catch (error) {
    exitWithError(error.stderr);
  }
  console.log();
}

async function createRegistrySecret() {
  console.log("Create registry secret on Kubernetes cluster...");
  try {
    await cleanRegisterSecret();
    const { exitCode, stdout } =
      await $`kubectl create secret docker-registry ocir-secret \
        --docker-server=${containerRegistryURL} \
        --docker-username=${namespace}/${containerRegistryUser} \
        --docker-password=${containerRegistryToken} \
        --docker-email=${containerRegistryUser}`;
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
  await createRedisConfig(redisPassword);
  await createKustomizationYaml(regionKey, namespace);
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
  const properties = await readEnvJson();

  const adbDisplayName = properties.adbDisplayName;

  const pwdOutput = (await $`pwd`).stdout.trim();
  await cd(`${pwdOutput}/deploy/k8s/base/score`);
  try {
    let { stdout, exitCode, stderr } =
      await $`sed s/TEMPLATE_ADB_SERVICE/${adbDisplayName}/ application.properties.template | sed s/TEMPLATE_ADB_PASSWORD/${adbPassword}/ > application.properties`;
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
    (db) => db["display-name"].toLowerCase() === name.toLowerCase()
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
  await cd("./web");
  const webVersion = await getVersion();
  await cd("../server");
  const serverVersion = await getVersion();
  await cd("../score");
  const scoreVersion = await getVersionGradle();
  await cd("..");

  await cd("./deploy/k8s/overlays/prod");
  try {
    let { exitCode, stderr } =
      await $`sed 's/REGION_KEY/${regionKey}/' kustomization.yaml_template \
         | sed 's/SERVER_TEMPLATE_VERSION/${serverVersion}/' \
         | sed 's/WEB_TEMPLATE_VERSION/${webVersion}/' \
         | sed 's/SCORE_TEMPLATE_VERSION/${scoreVersion}/' \
         | sed 's/TENANCY_NAMESPACE/${namespace}/' > kustomization.yaml`;
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
