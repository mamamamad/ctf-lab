import { generateKeyPair } from "jose";

let privateKey;
let publicJwk;

export async function loadKeys() {
  const { privateKey: generatedPrivateKey, publicKey } = await generateKeyPair(
    "RS256",
    {
      modulusLength: 3072,
    },
  );

  privateKey = generatedPrivateKey;

  const jwk = await exportJWK(publicKey);

  publicJwk = {
    ...jwk,
    kid: env.keyId,
    use: "sig",
    alg: "RS256",
  };
}

export function getPrivateKey() {
  return privateKey;
}

export function getPublicJwk() {
  return publicJwk;
}
