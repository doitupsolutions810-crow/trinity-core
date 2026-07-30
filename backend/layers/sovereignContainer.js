"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const ARTIFACT_DIR = process.env.TRINITY_ARTIFACT_DIR || "/tmp/trinity-ledger/artifacts";
function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function loadEncryptionKey() {
  const b64 = process.env.CONTAINER_KEY_BASE64 || "";
  if (!b64) {
    const seed = process.env.TRINITY_DEV_KEY_SEED || "trinity-core-dev-only-key-seed!!";
    return crypto.createHash("sha256").update(seed).digest();
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("CONTAINER_KEY_BASE64 must decode to exactly 32 bytes");
  return key;
}
function encryptPayload(payload, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return { encrypted, iv, authTag: cipher.getAuthTag() };
}
function decryptPayload(encrypted, iv, authTag, key) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
async function persistArtifact(bundleBuffer) {
  const digest = crypto.createHash("sha256").update(bundleBuffer).digest("hex");
  const cid = `sha256:${digest}`;
  let persistedToIpfs = false;
  if (process.env.IPFS_ENABLED === "true" && process.env.IPFS_API) {
    try {
      const res = await fetch(`${process.env.IPFS_API.replace(/\/$/, "")}/api/v0/add`, {
        method: "POST", body: bundleBuffer, headers: { "Content-Type": "application/octet-stream" },
      });
      if (res.ok) {
        const text = await res.text();
        const m = text.match(/"Hash"\s*:\s*"([^"]+)"/);
        if (m) return { cid: m[1], persistedToIpfs: true, digest };
      }
    } catch (err) { console.warn("[sovereign] IPFS persist failed:", err.message); }
  }
  ensureDir(ARTIFACT_DIR);
  const file = path.join(ARTIFACT_DIR, `${digest}.trinity-container`);
  fs.writeFileSync(file, bundleBuffer);
  return { cid, persistedToIpfs, digest, path: file };
}
async function generateSovereignContainer(specification = {}, workflow = {}) {
  const key = loadEncryptionKey();
  const payload = Buffer.from(JSON.stringify({ specification, workflow, generatedAt: new Date().toISOString(), source: "trinity-core-reality-forge" }, null, 2), "utf8");
  const { encrypted, iv, authTag } = encryptPayload(payload, key);
  const manifest = { name: specification.name || "unnamed", locale: specification.locale || "en", version: "2.1.0", algorithm: "aes-256-gcm", offlineCapable: true, trinity: true };
  const archive = { manifest, payload_enc: encrypted.toString("base64"), iv: iv.toString("base64"), authTag: authTag.toString("base64") };
  const zipBuffer = zlib.gzipSync(Buffer.from(JSON.stringify(archive), "utf8"));
  const persisted = await persistArtifact(zipBuffer);
  return { cid: persisted.cid, digest: persisted.digest, persistedToIpfs: persisted.persistedToIpfs, path: persisted.path || null, zipBase64: zipBuffer.toString("base64"), algorithm: "aes-256-gcm", version: "2.1.0" };
}
function openSovereignContainer(zipBase64) {
  const key = loadEncryptionKey();
  const raw = zlib.gunzipSync(Buffer.from(zipBase64, "base64"));
  const archive = JSON.parse(raw.toString("utf8"));
  const encrypted = Buffer.from(archive.payload_enc, "base64");
  const iv = Buffer.from(archive.iv, "base64");
  const authTag = Buffer.from(archive.authTag, "base64");
  const plain = decryptPayload(encrypted, iv, authTag, key);
  return { manifest: archive.manifest, payload: JSON.parse(plain.toString("utf8")) };
}
module.exports = { generateSovereignContainer, openSovereignContainer, loadEncryptionKey, ARTIFACT_DIR };
