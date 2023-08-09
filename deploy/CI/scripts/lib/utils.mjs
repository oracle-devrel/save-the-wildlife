#!/usr/bin/env zx

// TODO move to npm.mjs
export async function getVersion() {
  const { version } = await fs.readJson("./package.json");
  return version;
}

export async function validateBumpLevel(level) {
  if (!["major", "minor", "patch"].includes(level)) {
    exitWithError("Error: release version must be 'major', 'minor' or 'patch'");
  }
  return level;
}

// TODO move to oci.mjs
export async function getNamespace() {
  const output = (await $`oci os ns get`).stdout.trim();
  const { data } = JSON.parse(output);
  return data;
}

export async function printRegionNames(regions) {
  console.log("printRegionNames");
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

export async function generateRandomString() {
  try {
    const output = (await $`openssl rand -base64 ${22}`).stdout.trim();
    if (output.length) {
      const cleanPassword = output
        .replaceAll("/", "")
        .replaceAll("\\", "")
        .replaceAll("=", "");
      return cleanPassword;
    } else {
      exitWithError("random string generation failed");
    }
  } catch (error) {
    exitWithError(error.stderr);
  }
}

export async function getRegionByKey(code = "fra") {
  const output = (await $`oci iam region list`).stdout.trim();
  const { data } = JSON.parse(output);
  return data.find((r) => code.toUpperCase() === r.key);
}

export async function setVariableFromEnvOrPrompt(
  envKey,
  questionText,
  printChoices
) {
  const envValue = process.env[envKey];
  if (envValue) {
    return envValue;
  } else {
    if (printChoices) {
      printChoices();
    }
    const answer = await question(`${questionText}: `);
    return answer;
  }
}

export async function exitWithError(errorMessage = "") {
  console.error(chalk.red(errorMessage.trim()));
  process.exit(1);
}

export async function checkRequiredProgramsExist(programs) {
  try {
    for (let program of programs) {
      await which(program);
      console.log(`${chalk.green("[ok]")} ${program}`);
    }
  } catch (error) {
    exitWithError(`Error: Required command ${error.message}`);
  }
}
