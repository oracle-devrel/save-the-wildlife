#!/usr/bin/env zx
import { exitWithError } from "./utils.mjs";

export async function createSelfSignedCert(outputPath = ".") {
  await $`mkdir -p ${outputPath}`;
  const keyPath = path.normalize(path.join(outputPath, "tls.key"));
  const certPath = path.normalize(path.join(outputPath, "tls.crt"));
  try {
    await $`openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ${keyPath} -out ${certPath} -subj "/CN=nginxsvc/O=nginxsvc"`;
    console.log(`Key written to: ${chalk.yellow(keyPath)}`);
    console.log(`Cert written to: ${chalk.yellow(certPath)}`);
  } catch (error) {
    exitWithError(error.stderr);
  }
}
