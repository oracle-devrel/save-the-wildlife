import {
  getContainerInstanceShapes,
  getContainerInstances,
} from "./lib/oci.mjs";
import { readEnvJson } from "./lib/utils.mjs";

$.verbose = false;

let properties = await readEnvJson();
const {
  namespace,
  containerRegistryURL,
  containerRegistryUser,
  containerRegistryToken,
  serverVersion,
  webVersion,
} = properties;

const serverImageURL = `${containerRegistryURL}/${namespace}/save-the-wildlife/server:${serverVersion}`;
const webImageURL = `${containerRegistryURL}/${namespace}/save-the-wildlife/web:${webVersion}`;

const containersConfig = JSON.stringify([
  {
    displayName: "ServerContainer",
    imageUrl: serverImageURL,
    environmentVariables: { ENABLE_COHERENCE_BACKEND: false },
    resourceConfig: {
      memoryLimitInGBs: 8,
      vcpusLimit: 1.5,
    },
  },
  {
    displayName: "WebContainer",
    imageUrl: webImageURL,
    resourceConfig: {
      memoryLimitInGBs: 8,
      vcpusLimit: 1.5,
    },
  },
]);

const imagePullSecret = JSON.stringify([
  {
    password: btoa(containerRegistryToken),
    registryEndpoint: containerRegistryURL,
    secretType: "BASIC",
    username: btoa(containerRegistryUser),
  },
]);

await cd("deploy/vm/terraform");
const { stdout } = await $`terraform output -json`;
const terraformOutput = JSON.parse(stdout);
const values = {};
for (const [key, content] of Object.entries(terraformOutput)) {
  values[key] = content.value;
}
const { adName, compartmentId, subnetId, vcnName } = values;
await cd("../../..");

// TODO get container instance shapes fails
// try {
//   const ciShapes = await getContainerInstanceShapes(compartmentId);
//   const ciShapesNames = ciShapes.map((s) => s.name);
//   console.log(
//     `Container Instance Shapes: ${ciShapesNames
//       .map((n) => chalk.yellow(n))
//       .join(", ")}`
//   );
//   console.log();
// } catch (e) {}

const createContainerInstanceCommand = `oci container-instances container-instance create \
--display-name 'oci-MultiPlayer' \
--availability-domain '${adName}' \
--compartment-id '${compartmentId}' \
--containers '${containersConfig}' \
--shape 'CI.Standard.E4.Flex' \
--shape-config '{"memoryInGBs":16,"ocpus":4}' \
--vnics '[{ "displayName": "${vcnName}", "subnetId": "${subnetId}" }]' \
--image-pull-secrets '${imagePullSecret}'`;

console.log("Run the following command to CREATE container instance:");
console.log(chalk.yellow(createContainerInstanceCommand));
console.log();
const ciList = await getContainerInstances(compartmentId);
const cis = ciList
  .filter((ci) => ci["lifecycle-state"] !== "DELETED")
  .map((ci) => ({
    id: ci["id"],
    name: ci["display-name"],
    containers: ci["container-count"],
    state: ci["lifecycle-state"],
  }));
if (cis.length) {
  console.log("Existing Container Instances:");
  console.log(JSON.stringify(cis, null, 2));
  console.log("Run the following command to DELETE container instance:");
  console.log(
    chalk.yellow(
      `oci container-instances container-instance delete --container-instance-id CONTAINER_INSTANCE_OCID`
    )
  );
} else {
  console.log("No container Instances exist");
}
