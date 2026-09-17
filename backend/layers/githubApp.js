import { createSign } from "node:crypto";

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

export function mintAppJwt(appId, privateKeyPem) {
  if (!appId || !privateKeyPem) {
    throw new Error("FAIL_CLOSED: missing GitHub App id or private key");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: String(appId) }));
  const signingInput = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(signingInput);
  const sig = sign.sign(privateKeyPem, "base64url");
  return `${signingInput}.${sig}`;
}

export function loadGitHubAppEnv() {
  const production = process.env.PRODUCTION === "1";
  const appId = (process.env.GITHUB_APP_ID || "").trim();
  const installationId = (process.env.GITHUB_APP_INSTALLATION_ID || "").trim();
  const pem = (process.env.GITHUB_APP_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const allowPat = process.env.GITHUB_ALLOW_PAT_FALLBACK === "1" && !production;
  if (!appId || !installationId || !pem) {
    if (production || !allowPat) {
      throw new Error("FAIL_CLOSED: GitHub App credentials required");
    }
    return { mode: "pat", token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "" };
  }
  return { mode: "app", appId, installationId, pem };
}

export async function installationAccessToken(env = loadGitHubAppEnv()) {
  if (env.mode === "pat") {
    if (!env.token) throw new Error("FAIL_CLOSED: no GITHUB_TOKEN for lab fallback");
    return env.token;
  }
  const jwt = mintAppJwt(env.appId, env.pem);
  const res = await fetch(
    `https://api.github.com/app/installations/${env.installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${jwt}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "trinity-core-github-app",
      },
    }
  );
  if (!res.ok) throw new Error(`FAIL_CLOSED: installation token HTTP ${res.status}`);
  const body = await res.json();
  if (!body.token) throw new Error("FAIL_CLOSED: empty installation token");
  return body.token;
}
