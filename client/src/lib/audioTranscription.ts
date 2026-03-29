/**
 * Audio transcription service using @huggingface/transformers pipeline.
 * Lazy-loads the library to avoid bundling it in the initial chunk.
 */

const MODEL_ID = "LiquidAI/LFM2.5-Audio-1.5B-transformers-js";
const CACHE_NAME = "transformers-cache";
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN as string | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loadingPromise: Promise<any> | null = null;

export type ModelStatus = "idle" | "loading" | "ready" | "error";

export interface DownloadProgress {
  status: string;
  progress: number;
  file?: string;
  loaded?: number;
  total?: number;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

/** Lazy-import of @huggingface/transformers to keep initial bundle small. */
async function getTransformers() {
  return await import("@huggingface/transformers");
}

/**
 * Load the ASR model. Uses WebGPU if available, falls back to WASM.
 * Successive calls while loading will await the same promise.
 */
export async function loadTranscriptionModel(
  onProgress?: ProgressCallback,
): Promise<void> {
  if (transcriber) return;
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  const { pipeline } = await getTransformers();
  const useWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;

  const progressCb = onProgress
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data: any) => {
        onProgress({
          status: data.status ?? "loading",
          progress: data.progress ?? 0,
          file: data.file,
          loaded: data.loaded,
          total: data.total,
        });
      }
    : undefined;

  const createPipeline = (device: "webgpu" | "wasm") =>
    pipeline("automatic-speech-recognition", MODEL_ID, {
      device,
      dtype: "q4",
      progress_callback: progressCb,
      ...(HF_TOKEN ? { token: HF_TOKEN } : {}),
    });

  loadingPromise = (async () => {
    try {
      return await createPipeline(useWebGPU ? "webgpu" : "wasm");
    } catch (err) {
      // If WebGPU failed, try WASM fallback
      if (useWebGPU) {
        return await createPipeline("wasm");
      }
      throw err;
    }
  })();

  try {
    transcriber = await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

/** Transcribe audio from a URL (blob or server URL). */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  if (!transcriber) throw new Error("Model not loaded");

  const result = await transcriber(audioUrl);
  if (Array.isArray(result)) {
    return result[0]?.text?.trim() ?? "";
  }
  return result.text?.trim() ?? "";
}

export function isModelLoaded(): boolean {
  return transcriber !== null;
}

export function isModelLoading(): boolean {
  return loadingPromise !== null;
}

/** Dispose the in-memory model (cache stays intact). */
export function disposeModel(): void {
  if (transcriber && typeof transcriber.dispose === "function") {
    transcriber.dispose();
  }
  transcriber = null;
}

/** Check whether model files exist in the browser Cache API. */
export async function isModelCached(): Promise<boolean> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    return keys.some((r) => r.url.includes("LiquidAI"));
  } catch {
    return false;
  }
}

/** Compute the total size of cached model files (bytes). */
export async function getModelCacheSize(): Promise<number> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    let total = 0;
    for (const req of keys) {
      if (!req.url.includes("LiquidAI")) continue;
      const resp = await cache.match(req);
      if (resp) {
        const blob = await resp.clone().blob();
        total += blob.size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

/** Remove cached model files and dispose the in-memory model. */
export async function clearModelCache(): Promise<void> {
  disposeModel();
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    for (const req of keys) {
      if (req.url.includes("LiquidAI")) {
        await cache.delete(req);
      }
    }
  } catch {
    // silently ignore
  }
}

/** Returns true when the browser advertises WebGPU support. */
export function checkWebGPUSupport(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}
