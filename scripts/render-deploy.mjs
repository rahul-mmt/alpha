#!/usr/bin/env node
/**
 * Create (or update) the Render web service for this repo via the Render API.
 *
 *   RENDER_API_KEY=rnd_xxx APP_PASSWORD=... node scripts/render-deploy.mjs --repo https://github.com/<owner>/<repo> [--plan starter|free] [--branch main]
 *
 * - `starter` (default) attaches a 1 GB persistent disk at /var/data so the shared workflow + comments survive restarts.
 * - `free` has no disk: data resets whenever the instance restarts or redeploys (fine for a quick look, not for a working demo).
 */
const API = "https://api.render.com/v1";
const key = process.env.RENDER_API_KEY;
if (!key) fail("RENDER_API_KEY is required");

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith("--") ? [a.slice(2), arr[i + 1]] : [])).filter((x) => x.length));
const repo = args.repo;
const plan = args.plan ?? "starter";
const branch = args.branch ?? "main";
const name = args.name ?? "feature-workflow";
const appPassword = process.env.APP_PASSWORD;
if (!repo) fail("--repo https://github.com/<owner>/<repo> is required");
if (!appPassword) fail("APP_PASSWORD env var is required (the shared login password)");

const headers = { authorization: `Bearer ${key}`, "content-type": "application/json", accept: "application/json" };
const rq = async (method, path, body) => {
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) fail(`${method} ${path} → ${res.status}\n${text}`);
  return json;
};

const owners = await rq("GET", "/owners?limit=20");
const owner = owners.find((o) => o.owner.type === "user")?.owner ?? owners[0]?.owner;
if (!owner) fail("No Render owner/workspace found for this API key");
console.log(`Owner: ${owner.name} (${owner.id})`);

const existing = (await rq("GET", `/services?name=${encodeURIComponent(name)}&limit=5`)).find((s) => s.service.name === name)?.service;

const secret = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
const envVars = [
  { key: "NODE_VERSION", value: "20" },
  { key: "DATA_DIR", value: plan === "free" ? "./data" : "/var/data" },
  { key: "APP_USER", value: process.env.APP_USER ?? "mosaic" },
  { key: "APP_PASSWORD", value: appPassword },
  { key: "AUTH_SECRET", value: secret },
];

let service = existing;
if (!service) {
  const body = {
    type: "web_service",
    name,
    ownerId: owner.id,
    repo,
    branch,
    autoDeploy: "yes",
    envVars,
    serviceDetails: {
      runtime: "node",
      plan,
      region: args.region ?? "oregon",
      healthCheckPath: "/api/health",
      envSpecificDetails: { buildCommand: "npm ci && npm run build", startCommand: "npm start" },
      ...(plan !== "free" ? { disk: { name: "workflow-data", mountPath: "/var/data", sizeGB: 1 } } : {}),
    },
  };
  const created = await rq("POST", "/services", body);
  service = created.service;
  console.log(`Created service ${service.id}`);
} else {
  console.log(`Service exists: ${service.id} — updating env vars and triggering deploy`);
  await rq("PUT", `/services/${service.id}/env-vars`, envVars.filter((e) => e.key !== "AUTH_SECRET"));
  await rq("POST", `/services/${service.id}/deploys`, { clearCache: "do_not_clear" });
}

console.log(`\nURL: ${service.serviceDetails?.url ?? `https://${name}.onrender.com`}`);
console.log("Watch the first deploy in the Render dashboard; it takes ~3–5 minutes.");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}
