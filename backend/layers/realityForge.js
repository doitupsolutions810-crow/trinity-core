"use strict";
const crypto = require("node:crypto");
const { generateSovereignContainer } = require("./sovereignContainer.js");
const registry = new Map();
const TEMPLATES = {
  QUANTUM_LINK: { description: "Entanglement simulation mesh", capabilities: ["entangle", "broadcast", "correlate"] },
  MORPHIC_MEMORY: { description: "Adaptive memory structures", capabilities: ["store", "recall", "reshape"] },
  REALITY_ANCHOR: { description: "Stability anchor to ledger", capabilities: ["anchor", "verify", "rollback-signal"] },
  GOD_MODE: { description: "Oversight facade", capabilities: ["oversee", "halt", "attest"] },
  CUSTOM_LAYER: { description: "Generic forged layer", capabilities: ["observe", "report"] },
};
function listTemplates() { return Object.entries(TEMPLATES).map(([name, t]) => ({ name, ...t })); }
function listLayers() { return Array.from(registry.values()); }
function forge(spec = {}) {
  const name = String(spec.name || "CUSTOM_LAYER").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 48) || "CUSTOM_LAYER";
  const template = TEMPLATES[name] || TEMPLATES.CUSTOM_LAYER;
  const id = `forge_${crypto.randomUUID().slice(0, 8)}`;
  const layer = {
    id, name, version: spec.version || "0.1.0",
    description: String(spec.description || template.description).slice(0, 500),
    capabilities: Array.isArray(spec.capabilities) && spec.capabilities.length ? spec.capabilities.slice(0, 12) : [...template.capabilities],
    status: "materialized", template: TEMPLATES[name] ? name : "CUSTOM_LAYER",
    createdAt: new Date().toISOString(),
    seed: crypto.createHash("sha256").update(id + name).digest("hex").slice(0, 16),
  };
  registry.set(id, layer);
  return layer;
}
async function forgeWithArtifact(spec = {}, workflow = {}) {
  const layer = forge(spec);
  const artifact = await generateSovereignContainer(
    { name: layer.name, locale: spec.locale || "en", description: layer.description, requirements: spec.requirements || layer.capabilities },
    { ...workflow, layerId: layer.id, template: layer.template, status: layer.status },
  );
  layer.artifact = { cid: artifact.cid, persistedToIpfs: artifact.persistedToIpfs, algorithm: artifact.algorithm, version: artifact.version };
  return { layer, artifact };
}
function getLayer(id) { return registry.get(id) || null; }
function dissolve(id) {
  const layer = registry.get(id);
  if (!layer) return null;
  registry.delete(id);
  return { ...layer, status: "dissolved", dissolvedAt: new Date().toISOString() };
}
module.exports = { forge, forgeWithArtifact, listLayers, getLayer, dissolve, listTemplates, TEMPLATES };
