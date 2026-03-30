import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Detect whether the current browser is running on a mobile/tablet device
 * by checking the User-Agent and touch capabilities.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua)) {
    return true;
  }
  // iPad with desktop UA (iPadOS 13+) — has touch + macintosh UA
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) {
    return true;
  }
  return false;
}

/**
 * Async GPU detection via WebGL renderer string.
 * Returns `true` if a discrete/integrated GPU is detected,
 * `false` if only a software renderer or no GPU info is available.
 */
export async function detectGPU(): Promise<boolean> {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return false;

    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (ext) {
      const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
      // Software renderers / CPU fallbacks
      if (/SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(renderer)) {
        return false;
      }
      return true;
    }

    // No debug extension — check basic renderer
    const renderer = gl.getParameter(gl.RENDERER) as string;
    if (/SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(renderer)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
