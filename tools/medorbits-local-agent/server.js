import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 4173);
const OLLAMA = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:3b";
const pending = new Map();

const extensions = new Set([".html", ".css", ".js", ".mjs", ".json", ".md", ".txt", ".yml", ".yaml", ".xml", ".svg"]);
const blocked = new Set([".env", ".env.local", ".npmrc", "package-lock.json", "yarn.lock"]);
const skipped = new Set([".git", "node_modules", ".next", "dist", "build", "coverage", ".medorbits-agent-backups"]);

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 500_000) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

function safePath(rel) {
  if (typeof rel !== "string" || !rel || path.isAbsolute(rel)) return false;
  const parts = rel.replaceAll("\\", "/").split("/");
  if (parts.some(p => !p || p === "." || p === ".." || p.startsWith("."))) return false;
  if (parts.some(p => skipped.has(p) || blocked.has(p.toLowerCase()))) return false;
  if (parts.some(p => /secret|credential|password|token|private.key/i.test(p))) return false;
  if (rel.startsWith("tools/medorbits-local-agent/")) return false;
  return extensions.has(path.extname(rel).toLowerCase());
}

async function scan(dir = ROOT, output = []) {
  if (output.length >= 80) return output;
  for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
    if (output.length >= 80) break;
    if (ent.isSymbolicLink()) continue;
    const full = path.join(dir, ent.name);
    const rel = path.relative(ROOT, full).split(path.sep).join("/");
    if (ent.isDirectory()) {
      if (!ent.name.startsWith(".") && !skipped.has(ent.name)) await scan(full, output);
    } else if (ent.isFile() && safePath(rel)) {
      const stat = await fs.stat(full);
      if (stat.size <= 40_000) output.push(rel);
    }
  }
  return output;
}

async function propose(request) {
  if (typeof request !== "string" || request.trim().length < 4 || request.length > 3000) {
    throw new Error("Describe your requested change in 4–3000 characters.");
  }

  const names = await scan();
  const context = [];
  let total = 0;

  for (const name of names) {
    if (context.length >= 25 || total > 120_000) break;
    const content = await fs.readFile(path.join(ROOT, name), "utf8");
    if (content.includes("\0")) continue;
    const section = `\n--- FILE: ${name} ---\n${content}\n`;
    if (total + Buffer.byteLength(section) > 120_000) continue;
    context.push(section);
    total += Buffer.byteLength(section);
  }

  const response = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      format: "json",
      options: { temperature: 0.1 },
      messages: [
        {
          role: "system",
          content: `You are the MedOrbits coding assistant.
Return JSON only: {"summary":"...","changes":[{"path":"relative/path","content":"complete new file content","reason":"..."}],"tests":["..."]}.
Propose minimal changes. Never include secrets, destructive operations, deployment commands, or changes to this agent. Only use allowed text files. Paths must be relative. Do not claim tests were run. Preserve existing architecture and design. If unsure, return no changes.`
        },
        {
          role: "user",
          content: `Repository: ${ROOT}\nRequest: ${request}\nRepository context:\n${context.join("")}`
        }
      ]
    }),
    signal: AbortSignal.timeout(180_000)
  });

  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);

  const data = await response.json();
  const result = JSON.parse(data.message.content);

  if (!Array.isArray(result.changes) || result.changes.length > 8) {
    throw new Error("Invalid proposal returned by model.");
  }

  const changes = [];

  for (const item of result.changes) {
    if (!safePath(item.path) || typeof item.content !== "string" || Buffer.byteLength(item.content) > 40_000) {
      throw new Error(`Unsafe or invalid proposed path: ${String(item.path)}`);
    }

    const full = path.resolve(ROOT, item.path);
    if (!full.startsWith(ROOT + path.sep)) throw new Error("Path outside repository.");

    let before = null;
    try {
      const st = await fs.lstat(full);
      if (!st.isFile() || st.isSymbolicLink()) throw new Error("Refusing non-regular file.");
      before = await fs.readFile(full, "utf8");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }

    changes.push({
      path: item.path,
      reason: String(item.reason || ""),
      before,
      content: item.content
    });
  }

  const id = crypto.randomUUID();
  pending.set(id, { summary: result.summary, tests: result.tests || [], changes });
  return { id, summary: result.summary, tests: result.tests || [], changes };
}

async function apply(id, confirmation) {
  if (confirmation !== "APPROVE FILE CHANGES") throw new Error("Approval phrase does not match.");

  const proposal = pending.get(id);
  if (!proposal) throw new Error("Proposal expired or not found.");

  const checked = [];

  for (const item of proposal.changes) {
    if (!safePath(item.path)) throw new Error("Blocked path.");
    const full = path.resolve(ROOT, item.path);
    let current = null;

    try {
      const st = await fs.lstat(full);
      if (!st.isFile() || st.isSymbolicLink()) throw new Error("Refusing non-regular file.");
      current = await fs.readFile(full, "utf8");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }

    if (current !== item.before) {
      throw new Error(`File changed since proposal: ${item.path}. Generate a fresh proposal.`);
    }

    checked.push({ ...item, full, current });
  }

  const backupRoot = path.join(ROOT, ".medorbits-agent-backups", new Date().toISOString().replace(/[:.]/g, "-"));

  for (const item of checked) {
    await fs.mkdir(path.dirname(item.full), { recursive: true });
    if (item.current !== null) {
      const backup = path.join(backupRoot, item.path);
      await fs.mkdir(path.dirname(backup), { recursive: true });
      await fs.writeFile(backup, item.current, { flag: "wx" });
    }
  }

  for (const item of checked) {
    await fs.writeFile(item.full, item.content, {
      encoding: "utf8",
      flag: item.current === null ? "wx" : "w"
    });
  }

  pending.delete(id);
  return { applied: checked.map(x => x.path), backupRoot };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);

    if (req.method === "GET" && url.pathname === "/api/status") {
      let connected = false;
      let models = [];
      try {
        const r = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(3000) });
        if (r.ok) {
          connected = true;
          models = (await r.json()).models?.map(m => m.name) || [];
        }
      } catch {}

      return send(res, 200, { connected, model: MODEL, models, root: ROOT });
    }

    if (req.method === "POST" && url.pathname === "/api/propose") {
      const body = await readBody(req);
      return send(res, 200, await propose(body.request));
    }

    if (req.method === "POST" && url.pathname === "/api/approve") {
      const body = await readBody(req);
      return send(res, 200, { ok: true, ...await apply(body.id, body.confirm) });
    }

    if (req.method === "POST" && url.pathname === "/api/reject") {
      const body = await readBody(req);
      return send(res, 200, { rejected: pending.delete(body.id) });
    }

    return send(res, 404, { error: "Not found" });
  } catch (e) {
    return send(res, 400, { error: e.message || "Request failed" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`MedOrbits coding API listening on http://${HOST}:${PORT}`);
  console.log(`Repository: ${ROOT}`);
  console.log(`Ollama: ${OLLAMA} | Model: ${MODEL}`);
  console.log("No Git commit, push, merge, or deployment commands are provided.");
});
