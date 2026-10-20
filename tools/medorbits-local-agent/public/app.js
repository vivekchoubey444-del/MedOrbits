const $ = id => document.getElementById(id);
let proposalId = null;

async function api(url, body) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function message(text, error = false) {
  $("message").textContent = text;
  $("message").style.color = error ? "#ffc3c3" : "#baf0d4";
}

async function status() {
  try {
    const s = await api("/api/status");
    $("status").textContent = s.connected
      ? `Ollama connected · Model: ${s.model} · ${s.root}`
      : `Ollama is not reachable at the configured address. Model: ${s.model}`;
  } catch (e) {
    $("status").textContent = e.message;
  }
}

$("propose").addEventListener("click", async () => {
  const request = $("request").value.trim();
  if (request.length < 4) return message("Enter a more detailed request.", true);

  $("propose").disabled = true;
  message("Inspecting files and requesting a proposal from Ollama…");

  try {
    const p = await api("/api/propose", { request });
    proposalId = p.id;
    $("summary").textContent = p.summary;
    $("changes").replaceChildren();

    for (const change of p.changes) {
      const article = document.createElement("article");
      const title = document.createElement("h3");
      title.textContent = change.path;
      const reason = document.createElement("p");
      reason.textContent = change.reason || "Reason not provided.";
      const pre = document.createElement("pre");

      const oldLines = (change.before ?? "").split("\n");
      const newLines = change.content.split("\n");
      const diff = [];
      const max = Math.max(oldLines.length, newLines.length);

      diff.push("--- existing file", "+++ proposed file");
      for (let i = 0; i < max; i++) {
        if (oldLines[i] !== newLines[i]) {
          if (oldLines[i] !== undefined) diff.push("-" + oldLines[i]);
          if (newLines[i] !== undefined) diff.push("+" + newLines[i]);
        }
      }
      pre.textContent = diff.join("\n");
      article.append(title, reason, pre);
      $("changes").append(article);
    }

    $("tests").replaceChildren();
    for (const test of p.tests || []) {
      const li = document.createElement("li");
      li.textContent = test;
      $("tests").append(li);
    }

    $("confirmation").value = "";
    $("approve").disabled = true;
    $("review").hidden = false;
    $("review").scrollIntoView({ behavior: "smooth" });
    message("Review all changes before approving.");
  } catch (e) {
    message(e.message, true);
  } finally {
    $("propose").disabled = false;
  }
});

$("confirmation").addEventListener("input", () => {
  $("approve").disabled =
    $("confirmation").value !== "APPROVE FILE CHANGES" || !proposalId;
});

$("approve").addEventListener("click", async () => {
  if (!proposalId || $("confirmation").value !== "APPROVE FILE CHANGES") return;
  if (!confirm("Apply the reviewed changes to your repository?")) return;

  $("approve").disabled = true;
  try {
    const result = await api("/api/approve", {
      id: proposalId,
      confirm: "APPROVE FILE CHANGES"
    });
    message(`Applied: ${result.applied.join(", ")}. Review and test the changes now.`);
    proposalId = null;
    $("review").hidden = true;
  } catch (e) {
    message(e.message, true);
    $("approve").disabled =
      $("confirmation").value !== "APPROVE FILE CHANGES" || !proposalId;
  }
});

$("reject").addEventListener("click", async () => {
  if (proposalId) {
    try { await api("/api/reject", { id: proposalId }); } catch {}
  }
  proposalId = null;
  $("review").hidden = true;
  $("confirmation").value = "";
  message("Proposal rejected. No proposed changes were applied.");
});

status();
