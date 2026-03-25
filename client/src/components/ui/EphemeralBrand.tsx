import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";

/* ── Timing constants (ms) ─────────────────────────────── */
const LETTER_DELAY = 110; // gap between each letter appearing
const ICON_APPEAR_AFTER = 250; // pause after last letter before icon shows
const HOLD_DURATION = 2800; // how long everything stays visible
const RESTART_PAUSE = 1000; // pause after disintegration before loop
const DISINTEGRATE_OVERLAP = 710; // ms overlap between consecutive disintegrations

/* ── Per-element disintegration ──────────────────────────── */
const PARTICLE_COUNT = 55; // per element (letter or icon)
const DISINTEGRATE_MS = 780; // how long the particle animation lasts (longer = bigger spread)

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/**
 * Disintegrate a single small DOM element (letter or icon) with square
 * particles flying to the left. The element is clip-hidden right→left
 * while particles burst out.
 */
function disintegrateElement(
  el: HTMLElement,
  palette: string[],
): Promise<void> {
  return new Promise((resolve) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      el.style.opacity = "0";
      el.style.clipPath = "none";
      resolve();
      return;
    }

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
    });

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const size = rand(3, 6);
      const p = document.createElement("div");
      Object.assign(p.style, {
        position: "absolute",
        left: `${rand(0, rect.width)}px`,
        top: `${rand(0, rect.height)}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "2px",
        backgroundColor: palette[Math.floor(Math.random() * palette.length)],
        opacity: "1",
        pointerEvents: "none",
      });
      wrapper.appendChild(p);
    }

    document.body.appendChild(wrapper);

    // Clip-hide element right → left — NO fill:forwards to avoid
    // the animation layer overriding inline styles on the next cycle
    const clipAnim = el.animate(
      [
        { clipPath: "inset(0 0 0 0)", opacity: 1 },
        { clipPath: "inset(0 100% 0 0)", opacity: 0 },
      ],
      { duration: DISINTEGRATE_MS * 0.5, easing: "ease-in" },
    );
    // Commit final state to inline styles when clip animation ends
    clipAnim.onfinish = () => {
      el.style.clipPath = "inset(0 100% 0 0)";
      el.style.opacity = "0";
    };

    // Particles fly right
    const anims = (Array.from(wrapper.children) as HTMLDivElement[]).map(
      (p) => {
        const tx = rand(15, 80);
        const ty = rand(-35, 35);
        const rot = rand(-90, 90);
        return p.animate(
          [
            { transform: "translate(0,0) rotate(0deg) scale(1)", opacity: 1 },
            {
              transform: `translate(${tx}px,${ty}px) rotate(${rot}deg) scale(0.2)`,
              opacity: 0,
            },
          ],
          {
            duration: rand(DISINTEGRATE_MS * 0.5, DISINTEGRATE_MS),
            delay: rand(0, DISINTEGRATE_MS * 0.15),
            easing: "cubic-bezier(.25,.1,.25,1)",
            fill: "forwards",
          },
        );
      },
    );

    Promise.all(anims.map((a) => a.finished)).then(() => {
      wrapper.remove();
      // Cancel any lingering animations and commit final inline state
      el.getAnimations().forEach((a) => a.cancel());
      el.style.clipPath = "inset(0 100% 0 0)";
      el.style.opacity = "0";
      resolve();
    });
  });
}

/* ── Helpers for sleep ───────────────────────────────────── */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Animated branding block for auth pages.
 *
 * Layout: "Ephemeral" text + message icon (icon on the right)
 *
 * 1. Letters appear one-by-one left → right
 * 2. Icon pops in after last letter
 * 3. Hold a few seconds
 * 4. Disintegrate element by element: icon first, then each letter R→L
 * 5. Pause, then loop
 */
export default function EphemeralBrand() {
  const iconRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const aliveRef = useRef(true);

  const word = "Ephemeral";

  useEffect(() => {
    aliveRef.current = true;
    runCycle();
    return () => {
      aliveRef.current = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function later(fn: () => void, ms: number) {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  }

  function runCycle() {
    if (!aliveRef.current) return;

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const letters = letterRefs.current;
    const icon = iconRef.current;
    if (!icon) return;

    // ── Reset everything invisible ──────────────────────
    for (const l of letters) {
      if (!l) continue;
      l.getAnimations().forEach((a) => a.cancel());
      l.style.transition = "none";
      l.style.opacity = "0";
      l.style.transform = "translateY(6px)";
      l.style.clipPath = "none";
    }

    icon.getAnimations().forEach((a) => a.cancel());
    icon.style.transition = "none";
    icon.style.opacity = "0";
    icon.style.transform = "scale(0.6)";
    icon.style.clipPath = "none";

    // Force the reset to be fully painted before scheduling appearances.
    // Double-rAF guarantees a full frame has been committed.
    requestAnimationFrame(() => {
      if (!aliveRef.current) return;
      requestAnimationFrame(() => {
        if (!aliveRef.current) return;
        scheduleAppearances();
      });
    });
  }

  function scheduleAppearances() {
    const letters = letterRefs.current;
    const icon = iconRef.current;
    if (!icon) return;

    // ── 1. Letters appear one by one ────────────────────
    for (let i = 0; i < letters.length; i++) {
      later(() => {
        const l = letters[i];
        if (!l) return;
        l.style.transition = "opacity 0.22s ease-out, transform 0.22s ease-out";
        l.style.opacity = "1";
        l.style.transform = "translateY(0)";
      }, i * LETTER_DELAY);
    }

    // ── 2. Icon appears after last letter ───────────────
    const iconTime = letters.length * LETTER_DELAY + ICON_APPEAR_AFTER;
    later(() => {
      icon.style.transition =
        "opacity 0.35s ease-out, transform 0.35s cubic-bezier(.34,1.56,.64,1)";
      icon.style.opacity = "1";
      icon.style.transform = "scale(1)";
    }, iconTime);

    // ── 3. Hold, then disintegrate element by element ───
    const destroyTime = iconTime + 400 + HOLD_DURATION;
    later(async () => {
      if (!aliveRef.current) return;

      const accentPalette = [
        "#2563EB",
        "#1d4ed8",
        "#3B82F6",
        "#60a5fa",
        "#1e40af",
      ];
      const textPalette = [
        "#e2e8f0",
        "#94a3b8",
        "#cbd5e1",
        "#f1f5f9",
        "#64748b",
      ];

      // 4 — Disintegrate icon first, then letters R→L, with overlap
      const stagger = Math.max(0, DISINTEGRATE_MS - DISINTEGRATE_OVERLAP);
      const reversed = [...letters]
        .filter(Boolean)
        .reverse() as HTMLSpanElement[];
      const elements: { el: HTMLElement; palette: string[] }[] = [
        { el: icon, palette: accentPalette },
        ...reversed.map((l) => ({
          el: l as HTMLElement,
          palette: textPalette,
        })),
      ];

      const promises: Promise<void>[] = [];
      for (let i = 0; i < elements.length; i++) {
        if (i > 0) {
          await sleep(stagger);
          if (!aliveRef.current) return;
        }
        promises.push(disintegrateElement(elements[i].el, elements[i].palette));
      }
      await Promise.all(promises);

      // 5 — Restart loop
      if (aliveRef.current) {
        later(runCycle, RESTART_PAUSE);
      }
    }, destroyTime);
  }

  return (
    <div className="flex items-center justify-center mb-3 md:mb-4 select-none">
      <div className="flex items-center gap-3">
        {/* Letters */}
        <span aria-label={word}>
          {word.split("").map((ch, i) => (
            <span
              key={i}
              ref={(el) => {
                letterRefs.current[i] = el;
              }}
              className="ephemeral-letter"
              aria-hidden="true"
            >
              {ch}
            </span>
          ))}
        </span>

        {/* Icon — to the right of the text */}
        <div
          ref={iconRef}
          className="w-10 h-10 md:w-12 md:h-12 bg-accent rounded-md flex items-center justify-center text-white"
          style={{ opacity: 0, transform: "scale(0.6)" }}
        >
          <MessageSquare className="w-6 h-6 md:w-7 md:h-7 fill-current" />
        </div>
      </div>
    </div>
  );
}
