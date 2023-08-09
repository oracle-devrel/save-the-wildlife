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

export async function createRSAKeyPair(outputPath = ".") {
  await $`mkdir -p ${outputPath}`;
  const privateKeyPath = path.normalize(path.join(outputPath, "rsa.pem"));
  const publicKeyPath = path.normalize(path.join(outputPath, "rsa_public.pem"));
  try {
    await $`openssl genrsa -out ${privateKeyPath} 2048`;
    console.log(`RSA Private Key written to: ${chalk.yellow(privateKeyPath)}`);
    await $`openssl rsa -in ${privateKeyPath} -outform PEM -pubout -out ${publicKeyPath}`;
    console.log(`RSA Public Key written to: ${chalk.yellow(publicKeyPath)}`);
  } catch (error) {
    exitWithError(error.stderr);
  }
}
