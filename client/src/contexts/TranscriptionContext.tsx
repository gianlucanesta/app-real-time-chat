import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  loadTranscriptionModel,
  transcribeAudio,
  isModelLoaded,
  disposeModel,
  clearModelCache as clearCache,
  getModelCacheSize,
  isModelCached as checkCached,
  checkWebGPUSupport,
  type DownloadProgress,
  type ModelStatus,
} from "../lib/audioTranscription";
import { isMobileDevice, detectGPU } from "../lib/utils";

interface TranscriptionContextValue {
  modelStatus: ModelStatus;
  downloadProgress: DownloadProgress | null;
  webGPUSupported: boolean;
  /** false on mobile devices or when no GPU is detected (CPU-only). */
  transcriptionAvailable: boolean;
  loadModel: () => Promise<void>;
  unloadModel: () => void;
  transcribe: (audioUrl: string) => Promise<string>;
  clearModelCache: () => Promise<void>;
  cacheSize: number;
  isModelCached: boolean;
  refreshCacheInfo: () => Promise<void>;
}

const TranscriptionContext = createContext<TranscriptionContextValue | null>(
  null,
);

export function TranscriptionProvider({ children }: { children: ReactNode }) {
  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [cacheSize, setCacheSize] = useState(0);
  const [cached, setCached] = useState(false);
  const webGPUSupported = checkWebGPUSupport();
  const [hasGPU, setHasGPU] = useState(true); // optimistic default
  const isMobile = isMobileDevice();
  const transcriptionAvailable = !isMobile && hasGPU;

  const refreshCacheInfo = useCallback(async () => {
    const [size, isCached] = await Promise.all([
      getModelCacheSize(),
      checkCached(),
    ]);
    setCacheSize(size);
    setCached(isCached);
  }, []);

  // Check cache + GPU on mount
  useEffect(() => {
    refreshCacheInfo();
    detectGPU().then(setHasGPU);
  }, [refreshCacheInfo]);

  const loadModel = useCallback(async () => {
    if (isModelLoaded()) {
      setModelStatus("ready");
      return;
    }
    setModelStatus("loading");
    setDownloadProgress(null);
    try {
      await loadTranscriptionModel((progress) => {
        setDownloadProgress(progress);
      });
      setModelStatus("ready");
      await refreshCacheInfo();
    } catch {
      setModelStatus("error");
    }
  }, [refreshCacheInfo]);

  const unloadModel = useCallback(() => {
    disposeModel();
    setModelStatus("idle");
  }, []);

  const transcribe = useCallback(
    async (audioUrl: string) => {
      if (!isModelLoaded()) {
        await loadModel();
      }
      return transcribeAudio(audioUrl);
    },
    [loadModel],
  );

  const clearModelCacheFn = useCallback(async () => {
    await clearCache();
    setModelStatus("idle");
    setCacheSize(0);
    setCached(false);
  }, []);

  return (
    <TranscriptionContext.Provider
      value={{
        modelStatus,
        downloadProgress,
        webGPUSupported,
        transcriptionAvailable,
        loadModel,
        unloadModel,
        transcribe,
        clearModelCache: clearModelCacheFn,
        cacheSize,
        isModelCached: cached,
        refreshCacheInfo,
      }}
    >
      {children}
    </TranscriptionContext.Provider>
  );
}

export function useTranscription() {
  const ctx = useContext(TranscriptionContext);
  if (!ctx)
    throw new Error(
      "useTranscription must be used within TranscriptionProvider",
    );
  return ctx;
}
