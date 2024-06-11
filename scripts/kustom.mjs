import { createSelfSignedCert } from "./lib/tls.mjs";
import { getVersionGradle } from "./lib/gradle.mjs";
import { getNpmVersion } from "./lib/npm.mjs";
import { getNamespace } from "./lib/oci.mjs";
import { exitWithError } from "./lib/utils.mjs";

$.verbose = false;

const { _ } = argv;
const [key, redisPassword, adbAdminPassword, adbService] = _;

const regionKey = key;
const namespace = await getNamespace();

await createKustomizationYaml(regionKey, namespace);

await createWsServerConfigFile(redisPassword);
await createRedisConfigFile(redisPassword);
await createScoreConfigFile(adbAdminPassword, adbService);
await createCerts();

async function createKustomizationYaml(regionKey, namespace) {
  const pwdOutput = (await $`pwd`).stdout.trim();
  await cd(`${pwdOutput}/server`);
  const wsServerVersion = await getNpmVersion();
  await cd(`${pwdOutput}/web`);
  const webVersion = await getNpmVersion();
  await cd(`${pwdOutput}/score`);
  const scoreVersion = await getVersionGradle();
  await cd(pwdOutput);

  console.log(`ws-server v${wsServerVersion}`);
  console.log(`web v${webVersion}`);
  console.log(`score v${scoreVersion}`);

  await cd("./deploy/k8s/overlays/devops");
  try {
    let { exitCode, stderr } =
      await $`sed 's/REGION_KEY/${regionKey}/' kustomization.yaml_template \
    | sed 's/WEB_VERSION/${webVersion}/' \
    | sed 's/WS_SERVER_VERSION/${wsServerVersion}/' \
    | sed 's/SCORE_VERSION/${scoreVersion}/' \
    | sed 's/NAMESPACE/${namespace}/' > kustomization.yaml`;
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

async function createWsServerConfigFile(redisPassword) {
  const pwdOutput = (await $`pwd`).stdout.trim();
  await cd("./deploy/k8s/base/ws-server/");
  const replaceCmdRedisPassword = `s/MASTERPASSWORD/${redisPassword}/`;
  try {
    let { exitCode, stderr } = await $`sed '${replaceCmdRedisPassword}' \
          env_server_template > .env_server`;
    if (exitCode !== 0) {
      exitWithError(`Error creating .env_server: ${stderr}`);
    }
    console.log(`Overlay ${chalk.green(".env_server")} created.`);
  } catch (error) {
    exitWithError(error.stderr);
  } finally {
    await cd(pwdOutput);
  }
}

async function createRedisConfigFile(redisPassword) {
  const pwdOutput = (await $`pwd`).stdout.trim();
  await cd("./deploy/k8s/base/ws-server/");
  const replaceCmdRedisPassword = `s/MASTERPASSWORD/${redisPassword}/`;
  try {
    let { exitCode, stderr } = await $`sed '${replaceCmdRedisPassword}' \
              redis.conf.template > redis.conf`;
    if (exitCode !== 0) {
      exitWithError(`Error creating redis.conf: ${stderr}`);
    }
    console.log(`Overlay ${chalk.green("redis.conf")} created.`);
  } catch (error) {
    exitWithError(error.stderr);
  } finally {
    await cd(pwdOutput);
  }
}

async function createScoreConfigFile(adbAdminPassword, adbService) {
  const pwdOutput = (await $`pwd`).stdout.trim();
  await cd("./deploy/k8s/base/score/");
  const replaceCmdAdbPassword = `s/TEMPLATE_ADB_PASSWORD/${adbAdminPassword}/`;
  const replaceCmdAdbService = `s/TEMPLATE_ADB_SERVICE/${adbService}_high/`;
  try {
    let { exitCode, stderr } =
      await $`sed '${replaceCmdAdbPassword}' application.properties.template \
            | sed '${replaceCmdAdbService}' > application.properties`;
    if (exitCode !== 0) {
      exitWithError(`Error creating application.properties: ${stderr}`);
    }
    console.log(`Overlay ${chalk.green("application.properties")} created.`);
  } catch (error) {
    exitWithError(error.stderr);
  } finally {
    await cd(pwdOutput);
  }
}

async function createCerts() {
  console.log("Generate Self signed certs...");

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
