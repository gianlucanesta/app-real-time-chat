const PARTICLE_COUNT = 50;
const DURATION_MS = 900;

export interface DisintegrateOptions {
  particleCount?: number;
  durationMs?: number;
  squareOnly?: boolean;
}

/** Generate a random number in [min, max). */
function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** Parse an "rgb(r, g, b)" or "rgba(r,g,b,a)" string into [r,g,b]. */
function parseRgb(rgb: string): [number, number, number] | null {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}

/** Shift an RGB colour by a random amount, clamped to 0-255. */
function shiftColor(
  [r, g, b]: [number, number, number],
  amount: number,
): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const d = Math.round(rand(-amount, amount));
  return `rgb(${clamp(r + d)},${clamp(g + d)},${clamp(b + d)})`;
}

/**
 * Play a particle-disintegration effect on a DOM element.
 * Always sweeps right-to-left. Targets the inner bubble (.group\/bubble)
 * so the effect stays localised on the actual message, not the wrapper.
 */
export function disintegrate(
  element: HTMLElement,
  opts?: DisintegrateOptions,
): Promise<void> {
  const pCount = opts?.particleCount ?? PARTICLE_COUNT;
  const dur = opts?.durationMs ?? DURATION_MS;
  const squareOnly = opts?.squareOnly ?? false;

  return new Promise((resolve) => {
    const bubble =
      element.querySelector<HTMLElement>(".group\\/bubble") ?? element;
    const rect = bubble.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      resolve();
      return;
    }

    // Detect sent vs received and build palette from actual bubble colour
    const isSent =
      bubble.classList.contains("rounded-br-sm") ||
      element.classList.contains("self-end");

    let colors: string[];
    if (isSent) {
      colors = ["#2563EB", "#1d4ed8", "#3B82F6", "#1e40af"];
    } else {
      const bg = getComputedStyle(bubble).backgroundColor;
      const parsed = parseRgb(bg);
      if (parsed) {
        colors = Array.from({ length: 4 }, () => shiftColor(parsed, 25));
      } else {
        // fallback dark-card tones
        colors = ["#131C2E", "#1E293B", "#0b1120", "#1a2332"];
      }
    }

    // Create particle overlay positioned exactly on the bubble
    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      pointerEvents: "none",
      zIndex: "9999",
      overflow: "visible",
      willChange: "transform",
    });

    for (let i = 0; i < pCount; i++) {
      const p = document.createElement("div");
      const size = rand(3, 7);
      const startX = rand(0, rect.width);
      const startY = rand(0, rect.height);

      Object.assign(p.style, {
        position: "absolute",
        left: `${startX}px`,
        top: `${startY}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: squareOnly ? "2px" : Math.random() > 0.5 ? "50%" : "2px",
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        opacity: "1",
        pointerEvents: "none",
        willChange: "transform, opacity",
      });

      wrapper.appendChild(p);
    }

    document.body.appendChild(wrapper);

    // Sweep-fade bubble right → left
    bubble.animate(
      [
        { clipPath: "inset(0 0 0 0)", opacity: 1 },
        { clipPath: "inset(0 100% 0 0)", opacity: 0 },
      ],
      { duration: dur * 0.6, easing: "ease-in", fill: "forwards" },
    );

    // Particles — right-to-left with stagger (rightmost first)
    const particles = Array.from(wrapper.children) as HTMLDivElement[];
    const animations = particles.map((p) => {
      const px = parseFloat(p.style.left) / rect.width;
      const delay = (1 - px) * dur * 0.3;
      const duration = rand(dur * 0.4, dur * 0.8);
      const tx = rand(-160, -30);
      const ty = rand(-50, 50);
      const rot = rand(-90, 90);

      return p.animate(
        [
          { transform: "translate(0,0) rotate(0deg) scale(1)", opacity: 1 },
          {
            transform: `translate(${tx}px,${ty}px) rotate(${rot}deg) scale(0.3)`,
            opacity: 0,
          },
        ],
        {
          duration,
          delay,
          easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
          fill: "forwards",
        },
      );
    });

    Promise.all(animations.map((a) => a.finished)).then(() => {
      wrapper.remove();
      bubble.getAnimations().forEach((a) => a.cancel());
      resolve();
    });
  });
}
