import { useEffect, useRef, useCallback } from "react";

interface EvervaultBackgroundProps {
  className?: string;
  /** Characters used for the encrypted text effect */
  characters?: string;
  /** Font size in pixels for each character */
  fontSize?: number;
  /** Array of CSS colors for characters (blues by default) */
  colors?: string[];
  /** Radius of the mouse-follow glow in pixels */
  glowRadius?: number;
  /** How bright characters are near the cursor (0-1) */
  glowIntensity?: number;
  /** How fast characters scramble (ms between changes) */
  scrambleInterval?: number;
  /** Edge vignette strength (0 = none, 1 = full black edges) */
  vignetteStrength?: number;
  /** Base opacity of characters outside glow (0-1) */
  baseOpacity?: number;
}

const DEFAULT_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?<>{}[]|/\\~^";

const DEFAULT_COLORS = [
  "#2563eb", // blue-600 (accent)
  "#3b82f6", // blue-500
  "#60a5fa", // blue-400
  "#1d4ed8", // blue-700
  "#1e40af", // blue-800
  "#93c5fd", // blue-300
  "#38bdf8", // sky-400
  "#0ea5e9", // sky-500
  "#06b6d4", // cyan-500
  "#22d3ee", // cyan-400
  "#818cf8", // indigo-400
  "#6366f1", // indigo-500
];

export function EvervaultBackground({
  className,
  characters = DEFAULT_CHARS,
  fontSize = 14,
  colors = DEFAULT_COLORS,
  glowRadius = 280,
  glowIntensity = 1,
  scrambleInterval = 80,
  vignetteStrength = 0.85,
  baseOpacity = 0.06,
}: EvervaultBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const gridRef = useRef<{ char: string; color: string; nextChange: number }[]>(
    [],
  );
  const rafRef = useRef<number>(0);
  const colsRef = useRef(0);
  const rowsRef = useRef(0);

  const randomChar = useCallback(
    () => characters[Math.floor(Math.random() * characters.length)],
    [characters],
  );

  const randomColor = useCallback(
    () => colors[Math.floor(Math.random() * colors.length)],
    [colors],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;

    const cellW = fontSize * 0.85;
    const cellH = fontSize * 1.2;

    const initGrid = (cols: number, rows: number) => {
      const total = cols * rows;
      const grid: { char: string; color: string; nextChange: number }[] = [];
      const now = performance.now();
      for (let i = 0; i < total; i++) {
        grid.push({
          char: randomChar(),
          color: randomColor(),
          nextChange: now + Math.random() * scrambleInterval * 3,
        });
      }
      gridRef.current = grid;
      colsRef.current = cols;
      rowsRef.current = rows;
    };

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.ceil(w / cellW) + 1;
      const rows = Math.ceil(h / cellH) + 1;
      initGrid(cols, rows);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    const draw = (now: number) => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cols = colsRef.current;
      const rows = rowsRef.current;
      const grid = gridRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Clear with background color
      ctx.fillStyle = "#0b1120";
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${fontSize}px "Courier New", "Fira Code", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const glowR2 = glowRadius * glowRadius;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          const cell = grid[idx];
          if (!cell) continue;

          // Scramble character
          if (now >= cell.nextChange) {
            cell.char = randomChar();
            cell.color = randomColor();
            cell.nextChange =
              now + scrambleInterval + Math.random() * scrambleInterval * 2;
          }

          const cx = col * cellW + cellW / 2;
          const cy = row * cellH + cellH / 2;

          // Distance from mouse
          const dx = cx - mx;
          const dy = cy - my;
          const dist2 = dx * dx + dy * dy;

          // Calculate opacity based on distance from mouse
          let alpha: number;
          if (dist2 < glowR2) {
            const dist = Math.sqrt(dist2);
            const t = 1 - dist / glowRadius;
            // Smooth falloff with cubic easing
            alpha = baseOpacity + (glowIntensity - baseOpacity) * t * t * t;
          } else {
            alpha = baseOpacity;
          }

          if (alpha < 0.01) continue;

          ctx.globalAlpha = alpha;
          ctx.fillStyle = cell.color;
          ctx.fillText(cell.char, cx, cy);
        }
      }

      // Draw vignette overlay
      if (vignetteStrength > 0) {
        ctx.globalAlpha = 1;
        const gradient = ctx.createRadialGradient(
          w / 2,
          h / 2,
          Math.min(w, h) * 0.15,
          w / 2,
          h / 2,
          Math.max(w, h) * 0.75,
        );
        gradient.addColorStop(0, "rgba(11, 17, 32, 0)");
        gradient.addColorStop(
          0.5,
          `rgba(11, 17, 32, ${vignetteStrength * 0.3})`,
        );
        gradient.addColorStop(1, `rgba(11, 17, 32, ${vignetteStrength})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }

      // Draw mouse glow halo (subtle colored radial glow)
      if (mx > -1000 && my > -1000) {
        ctx.globalAlpha = 0.12;
        const mouseGlow = ctx.createRadialGradient(
          mx,
          my,
          0,
          mx,
          my,
          glowRadius * 0.6,
        );
        mouseGlow.addColorStop(0, "rgba(37, 99, 235, 0.4)");
        mouseGlow.addColorStop(0.4, "rgba(59, 130, 246, 0.15)");
        mouseGlow.addColorStop(1, "rgba(37, 99, 235, 0)");
        ctx.fillStyle = mouseGlow;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [
    characters,
    fontSize,
    colors,
    glowRadius,
    glowIntensity,
    scrambleInterval,
    vignetteStrength,
    baseOpacity,
    randomChar,
    randomColor,
  ]);

  return (
    <div
      ref={containerRef}
      className={`evervault-bg-container${className ? ` ${className}` : ""}`}
    >
      <canvas ref={canvasRef} className="evervault-bg-canvas" />
    </div>
  );
}
