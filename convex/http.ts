import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { EMPTY_AUDIO, MAX_AUDIO_BYTES, validateText, validateWav } from "./lib/captureValidation";

const http = httpRouter();
const BUSY = "Busy right now. Try again in a few minutes.";
const origins = new Set(["https://aware-starfish-233.convex.site", "http://localhost:5173", "http://127.0.0.1:5173"]);

function headers(request: Request) {
  const origin = request.headers.get("Origin") ?? "";
  return { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin",
    ...(origins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}

async function readBody(request: Request, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Nothing was captured. Try again or type it instead.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new Error("That update is too long. Try a shorter update."); }
    chunks.push(value);
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output.buffer;
}

for (const path of ["/capture-text", "/transcribe", "/interpret"]) {
  http.route({ path, method: "OPTIONS", handler: httpAction(async (_ctx, request) => new Response(null, { status: 204, headers: headers(request) })) });
}

http.route({ path: "/capture-text", method: "POST", handler: httpAction(async (_ctx, request) => {
  try {
    const body = await readBody(request, 40_000);
    const { text } = JSON.parse(new TextDecoder().decode(body));
    return Response.json({ text: validateText(text), source: "text" }, { headers: headers(request) });
  } catch (error) {
    return Response.json({ error: error instanceof Error && !(error instanceof SyntaxError) ? error.message : "Type what happened before continuing." }, { status: 400, headers: headers(request) });
  }
}) });

http.route({ path: "/transcribe", method: "POST", handler: httpAction(async (ctx, request) => {
  let audio: ArrayBuffer;
  try {
    audio = await readBody(request, MAX_AUDIO_BYTES);
    validateWav(audio);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : EMPTY_AUDIO }, { status: 400, headers: headers(request) });
  }
  const key = process.env.SARVAM_API_KEY;
  if (!key) return Response.json({ error: "Voice capture is unavailable right now. Try again or type it instead." }, { status: 503, headers: headers(request) });
  if (!await ctx.runMutation(internal.capture.reserveTranscription, {})) return Response.json({ error: BUSY }, { status: 429, headers: headers(request) });
  try {
    const form = new FormData();
    form.append("file", new Blob([audio], { type: "audio/wav" }), "update.wav");
    form.append("model", "saaras:v4");
    // Preserve the speaker's wording rather than normalizing their health update.
    form.append("mode", "verbatim");
    form.append("language_code", "unknown");
    form.append("keyterms", JSON.stringify(["blood pressure", "dizziness", "blood sugar", "appetite", "headache", "pukish", "puke", "Dad", "Mom"]));
    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST", headers: { "api-subscription-key": key }, body: form, signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error("provider-failure");
    const result = await response.json();
    if (typeof result.transcript !== "string" || !result.transcript.trim()) {
      return Response.json({ error: EMPTY_AUDIO }, { status: 422, headers: headers(request) });
    }
    const text = validateText(result.transcript);
    return Response.json({ text, source: "voice" }, { headers: headers(request) });
  } catch {
    return Response.json({ error: BUSY }, { status: 502, headers: headers(request) });
  }
}) });

http.route({ path: "/interpret", method: "POST", handler: httpAction(async (ctx, request) => {
  let args;
  try {
    const body = JSON.parse(new TextDecoder().decode(await readBody(request, 40_000)));
    const text = validateText(body.text);
    if (!body.patient || typeof body.patient.name !== "string" || !body.patient.name.trim() || body.patient.name.length > 500 ||
      typeof body.patient.relationship !== "string" || !body.patient.relationship.trim() || body.patient.relationship.length > 500 ||
      !["text", "voice"].includes(body.source) || typeof body.timeZone !== "string" || body.timeZone.length > 100) throw new Error("invalid-input");
    new Intl.DateTimeFormat("en-CA", { timeZone: body.timeZone });
    args = { text, source: body.source, patient: { name: body.patient.name.trim(), relationship: body.patient.relationship.trim() }, timeZone: body.timeZone };
  } catch {
    return Response.json({ error: "Check your update and patient details, then try again." }, { status: 400, headers: headers(request) });
  }
  try {
    const result = await ctx.runAction(internal.interpretation.interpret, args);
    return Response.json(result, { headers: headers(request) });
  } catch {
    return Response.json({ error: BUSY }, { status: 503, headers: headers(request) });
  }
}) });

export default http;
