#!/usr/bin/env zx
import { readEnvJson } from "./lib/utils.mjs";

$.verbose = true;

const { containerRegistryURL, containerRegistryUser, containerRegistryToken } =
  await readEnvJson();

// const region = env.REGION || await setVariableFromEnvOrPrompt("REGION", "Enter the region: ", getRegions);

const createContainerInstances = async (attributes) => {
  const output = await $`oci container-instances container-instance create \
    --display-name "${attributes.displayName}" \
    --availability-domain "${attributes.ad_ocid}" \
    --compartment-id "${attributes.compartment_ocid}" \
    --region "${attributes.region}" \
    --shape "CI.Standard.E4.Flex" \
    --shape-config '{"memoryInGBs":16,"ocpus":4}' \
    --containers ${JSON.stringify(containersArgs)} \
    --image-pull-secrets ${JSON.stringify(secretsArgs)} \
    --vnics ${JSON.stringify(vnicsArgs)} --debug`;
  return output;
};

const attributes = {
  displayName: "autoDeploTest",
  compartment_ocid: "xxx",
  ad_ocid: "xxx",
  subnet_ocid: "xxx",
  containerRegistryURL: containerRegistryURL,
  containerRegistryUser: containerRegistryUser,
  region: "xxx",
  servercontainerURL: "xxx.ocir.io/xxx/save-the-wildlife/server:0.0.8",
  webcontainerURL: "xxx.ocir.io/xxx/save-the-wildlife/web:0.0.8",
};

const vnicsArgs = [
  { displayName: "multiplayer vcn", subnetId: `${attributes.subnet_ocid}` },
];

const secretsArgs = [
  {
    password: btoa(containerRegistryToken),
    registryEndpoint: containerRegistryURL,
    secretType: "BASIC",
    username: btoa(containerRegistryUser),
  },
];

const containersArgs = [
  {
    displayName: "ServerContainer2",
    imageUrl: `${attributes.servercontainerURL}`,
    resourceConfig: {
      memoryLimitInGBs: 8,
      vcpusLimit: 1.5,
    },
  },
  {
    displayName: "WebContainer2",
    imageUrl: `${attributes.webcontainerURL}`,
    resourceConfig: {
      memoryLimitInGBs: 8,
      vcpusLimit: 1.5,
    },
  },
];

const output = await createContainerInstances(attributes);

console.log(output);

const display_name = "test";
const compartment_ocid = "xx";
const ad_ocid = "xxx";
// const subnet_ocid = await setVariableFromEnvOrPrompt("SUBNET_OCID", "Enter the OCID of the subnet: ");

createContainerInstances();
