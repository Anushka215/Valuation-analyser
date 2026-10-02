import { withTimeout } from "../shared/withTimeout.js";

// Ollama runs on the host machine, not in Docker (there's no practical way
// to containerize a GPU-accelerated local model here) - so the URL has to
// be configurable. Defaults to localhost for running everything outside
// Docker; docker-compose.yml overrides it so containers can reach the host.
const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "gemma3:4b";
// gemma3:4b on CPU takes ~76s to process a full report-sized prompt, so
// 30s was killing every real attempt before it could finish.
const DEFAULT_GEMMA_TIMEOUT_MS = 180_000;
// Large enough to hold a full OCR'd valuation report (often 20+ pages) plus
// our prompt instructions, so Gemma isn't silently truncating its input.
// Lower than the model's max so CPU inference stays as fast as possible.
const OLLAMA_NUM_CTX = 8192;

/**
 * Sends a prompt to Gemma (via a locally-running Ollama) and returns its
 * raw text response. This function does NOT parse or validate that text —
 * it's just the network call. Parsing and validation happen in
 * extractFields.ts, since the model's output must never be trusted as-is.
 */
export async function callGemma(prompt: string, timeoutMs = DEFAULT_GEMMA_TIMEOUT_MS): Promise<string> {
  const ollamaUrl = process.env["OLLAMA_URL"] ?? DEFAULT_OLLAMA_URL;
  const ollamaModel = process.env["OLLAMA_MODEL"] ?? DEFAULT_OLLAMA_MODEL;
  const request = fetch(`${ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaModel,
      prompt,
      stream: false,
      format: "json",
      options: { num_ctx: OLLAMA_NUM_CTX },
    }),
  });

  const response = await withTimeout(request, timeoutMs, `Gemma call timed out after ${timeoutMs}ms`);

  if (!response.ok) {
    throw new Error(`Gemma call failed with status ${response.status}`);
  }

  const body = (await response.json()) as { response?: string };
  return body.response ?? "";
}
