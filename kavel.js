// Kavel image node: msg.payload (prompt) in, msg.payload (image url) out.
// Free tier needs no key; an API key from https://www.kavel.ai/settings/apikeys
// lifts the daily limit and the watermark.
const crypto = require("crypto");

const BASE_URL = "https://www.kavel.ai";
const MODEL_GENERATE = "kavel-image-v1";
const MODEL_EDIT = "nano-banana-2-lite";

function anonId() {
  return "nodered-" + crypto.randomBytes(8).toString("hex");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Submit envelope → task id, or a message the user can act on.
function parseSubmit(env) {
  if (env.code !== 0) throw new Error(env.message || "request refused");
  const d = env.data || {};
  if (d.wall === true) {
    throw new Error(
      `free allowance spent for now — add an API key from ${BASE_URL}/settings/apikeys to keep going`,
    );
  }
  if (typeof d.id !== "string" || !d.id) throw new Error("the service returned no task id");
  return d.id;
}

async function run(payload, apiKey, timeoutMs) {
  const auth = apiKey ? { authorization: `Bearer ${apiKey}` } : { "x-anon-id": anonId() };
  const res = await fetch(`${BASE_URL}/api/ai/generate`, {
    method: "POST",
    headers: { "content-type": "application/json", ...auth },
    body: JSON.stringify(payload),
  });
  const task = parseSubmit(await res.json());

  // Queued runs only reach the model on the poll that crosses the end of the
  // wait, so polling is what starts the work.
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(5000);
    let env;
    try {
      const r = apiKey
        ? await fetch(`${BASE_URL}/api/ai/query`, {
            method: "POST",
            headers: { "content-type": "application/json", ...auth },
            body: JSON.stringify({ taskId: task }),
          })
        : await fetch(
            `${BASE_URL}/api/ai/anon-query?taskId=${encodeURIComponent(task)}&provider=kie&mediaType=image`,
            { headers: auth },
          );
      env = await r.json();
    } catch {
      continue; // a dropped poll is not a failed generation
    }
    if (env.code !== 0) continue;
    const d = env.data || {};
    if (d.cleanImages && d.cleanImages.length) return { url: d.cleanImages[0], watermarked: false };
    if (d.images && d.images.length) {
      return { url: d.images[0], watermarked: Boolean(d.watermarked && d.watermarked[0]) };
    }
    if (d.status === "failed" || d.status === "error") throw new Error("prompt refused");
  }
  throw new Error("timed out");
}

module.exports = function (RED) {
  function KavelImageNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.on("input", async (msg, send, done) => {
      const prompt = (msg.prompt || (typeof msg.payload === "string" ? msg.payload : "") || config.prompt || "").trim();
      const sourceUrl = msg.image || config.image || "";
      const apiKey = (node.credentials && node.credentials.apiKey) || process.env.KAVEL_API_KEY || "";
      if (!prompt) {
        done(new Error("no prompt: set msg.payload to a string or fill in the node's Prompt"));
        return;
      }

      const payload = sourceUrl
        ? {
            provider: "kie",
            mediaType: "image",
            model: MODEL_EDIT,
            scene: "image-to-image",
            prompt,
            options: { image_input: [sourceUrl] },
          }
        : {
            provider: "kie",
            mediaType: "image",
            model: MODEL_GENERATE,
            scene: "text-to-image",
            prompt,
            options: { aspect_ratio: msg.aspectRatio || config.aspectRatio || "1:1" },
          };

      node.status({ fill: "blue", shape: "dot", text: "generating" });
      try {
        const img = await run(payload, apiKey, Number(config.timeout || 360) * 1000);
        msg.payload = img.url;
        msg.kavel = img;
        node.status({ fill: "green", shape: "dot", text: img.watermarked ? "done (watermarked)" : "done" });
        send(msg);
        done();
      } catch (e) {
        node.status({ fill: "red", shape: "ring", text: String(e.message || e).slice(0, 40) });
        done(e);
      }
    });
  }

  RED.nodes.registerType("kavel-image", KavelImageNode, {
    credentials: { apiKey: { type: "password" } },
  });
};
