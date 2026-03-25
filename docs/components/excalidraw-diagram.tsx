'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';

const BG = '#1a1b26';
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

interface ExcalidrawDiagramProps {
  name: string;
  height?: number;
  caption?: string;
}

/* ------------------------------------------------------------------ */
/*  Toolbar button                                                     */
/* ------------------------------------------------------------------ */
function ToolbarBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 6,
        color: '#e2e8f0',
        width: 32,
        height: 32,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: 16,
        lineHeight: 1,
        padding: 0,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          'rgba(255,255,255,0.18)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          'rgba(255,255,255,0.08)';
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export function ExcalidrawDiagram({
  name,
  height = 500,
  caption,
}: ExcalidrawDiagramProps) {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // Viewport state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Drag state (refs to avoid re-renders during drag)
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  /* ---- fetch + export SVG ---- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/diagrams/${name}.excalidraw`);
        if (!res.ok) throw new Error(`Diagram ${name} not found`);
        const scene = await res.json();

        const { exportToSvg } = await import('@excalidraw/excalidraw');

        // Suppress the "Failed to use workers for subsetting" SecurityError
        // that Excalidraw logs when the bundled worker path is file:// instead
        // of https://. The library gracefully falls back to main-thread
        // processing — this just silences the console noise.
        const origError = console.error;
        const origWarn = console.warn;
        const suppress = (...args: unknown[]) => {
          if (String(args[0] ?? '').includes('workers for subsetting')) return;
          origError.apply(console, args);
        };
        const suppressW = (...args: unknown[]) => {
          if (String(args[0] ?? '').includes('workers for subsetting')) return;
          origWarn.apply(console, args);
        };
        console.error = suppress;
        console.warn = suppressW;

        let svg: SVGSVGElement;
        try {
          svg = await exportToSvg({
            elements: scene.elements ?? [],
            appState: {
              viewBackgroundColor: BG,
              theme: 'dark',
              exportWithDarkMode: true,
              exportBackground: true,
            },
            files: scene.files ?? {},
          });
        } finally {
          // Restore after a short delay to catch any deferred log calls
          setTimeout(() => {
            console.error = origError;
            console.warn = origWarn;
          }, 200);
        }

        if (cancelled) return;

        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');

        setSvgHtml(svg.outerHTML);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [name]);

  /* ---- zoom helpers ---- */
  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  const handleZoomIn = useCallback(
    () => setZoom((z) => clampZoom(z + ZOOM_STEP)),
    [],
  );
  const handleZoomOut = useCallback(
    () => setZoom((z) => clampZoom(z - ZOOM_STEP)),
    [],
  );
  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  /* ---- mouse-wheel zoom ---- */
  const handleWheel = useCallback((e: ReactWheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
  }, []);

  /* ---- drag-to-pan ---- */
  const handlePointerDown = useCallback((e: ReactMouseEvent) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pan]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (containerRef.current)
        containerRef.current.style.cursor = 'grab';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  /* ---- fullscreen ---- */
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((f) => !f);
    // Reset pan when entering fullscreen for a clean view
    setPan({ x: 0, y: 0 });
  }, []);

  // ESC to close fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  /* ---- error state ---- */
  if (error) {
    return (
      <div className="rounded-lg border border-fd-border bg-fd-muted/50 p-8 text-center text-fd-muted-foreground">
        Diagram not found: <code>{name}</code>
      </div>
    );
  }

  /* ---- SVG icons (inline to avoid extra deps) ---- */
  const iconPlus = <span style={{ fontSize: 18, fontWeight: 700 }}>+</span>;
  const iconMinus = <span style={{ fontSize: 18, fontWeight: 700 }}>&minus;</span>;
  const iconReset = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 1 3 7" /><path d="M3 22v-7h7" />
    </svg>
  );
  const iconFullscreen = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
  const iconClose = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  /* ---- toolbar ---- */
  const toolbar = (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
        display: 'flex',
        gap: 4,
        background: 'rgba(26,27,38,0.85)',
        backdropFilter: 'blur(8px)',
        borderRadius: 8,
        padding: '4px 6px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <ToolbarBtn label="Zoom in (Ctrl+scroll)" onClick={handleZoomIn}>{iconPlus}</ToolbarBtn>
      <ToolbarBtn label="Zoom out (Ctrl+scroll)" onClick={handleZoomOut}>{iconMinus}</ToolbarBtn>
      <ToolbarBtn label="Reset view" onClick={handleReset}>{iconReset}</ToolbarBtn>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, alignSelf: 'center', minWidth: 40, textAlign: 'center' }}>
        {Math.round(zoom * 100)}%
      </span>
      <ToolbarBtn
        label={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
        onClick={toggleFullscreen}
      >
        {isFullscreen ? iconClose : iconFullscreen}
      </ToolbarBtn>
    </div>
  );

  /* ---- SVG viewport ---- */
  const svgViewport = (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      {svgHtml ? (
        <div
          dangerouslySetInnerHTML={{ __html: svgHtml }}
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: dragging.current ? 'none' : 'transform 0.15s ease-out',
          }}
        />
      ) : (
        <div
          className="animate-pulse"
          style={{ width: '100%', height: '100%', background: BG }}
        />
      )}
    </div>
  );

  /* ---- fullscreen overlay ---- */
  if (isFullscreen) {
    return (
      <>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: BG,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            {toolbar}
            {svgViewport}
          </div>
          {caption && (
            <div style={{ textAlign: 'center', padding: '8px 0 12px', color: '#94a3b8', fontSize: 14 }}>
              {caption}
            </div>
          )}
        </div>
      </>
    );
  }

  /* ---- normal inline view ---- */
  return (
    <figure className="my-6 not-prose">
      <div
        className="rounded-lg border border-fd-border overflow-hidden"
        style={{ height, background: BG, position: 'relative' }}
      >
        {toolbar}
        {svgViewport}
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
