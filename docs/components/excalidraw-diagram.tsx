'use client';

import { useEffect, useRef, useState } from 'react';

const BG = '#1a1b26';

interface ExcalidrawDiagramProps {
  name: string;
  height?: number;
  caption?: string;
}

/**
 * Renders an Excalidraw diagram as a static SVG using `exportToSvg`.
 *
 * Previous versions used the interactive `<Excalidraw>` canvas component, but
 * its internal state lifecycle caused the canvas to blank out after mount in
 * production builds. Static SVG export eliminates every canvas/WebGL issue
 * while keeping full visual fidelity (dark theme, all element types, arrows,
 * text, embedded images).
 */
export function ExcalidrawDiagram({
  name,
  height = 500,
  caption,
}: ExcalidrawDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. Fetch the .excalidraw scene JSON
        const res = await fetch(`/diagrams/${name}.excalidraw`);
        if (!res.ok) throw new Error(`Diagram ${name} not found`);
        const scene = await res.json();

        // 2. Dynamically import the export utility (keeps SSR-safe)
        const { exportToSvg } = await import('@excalidraw/excalidraw');

        // 3. Convert elements → pure SVG (no canvas involved)
        const svg = await exportToSvg({
          elements: scene.elements ?? [],
          appState: {
            viewBackgroundColor: BG,
            theme: 'dark',
            exportWithDarkMode: true,
            exportBackground: true,
          },
          files: scene.files ?? {},
        });

        if (cancelled || !containerRef.current) return;

        // 4. Make the SVG responsive inside its container
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.maxHeight = `${height}px`;
        svg.style.objectFit = 'contain';

        // 5. Insert into the DOM
        containerRef.current.replaceChildren(svg);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [name, height]);

  if (status === 'error') {
    return (
      <div className="rounded-lg border border-fd-border bg-fd-muted/50 p-8 text-center text-fd-muted-foreground">
        Diagram not found: <code>{name}</code>
      </div>
    );
  }

  return (
    <figure className="my-6 not-prose">
      <div
        ref={containerRef}
        className="rounded-lg border border-fd-border overflow-hidden flex items-center justify-center"
        style={{ height, background: BG }}
      >
        {status === 'loading' && (
          <div
            className="animate-pulse rounded-lg"
            style={{ width: '100%', height: '100%', background: BG }}
          />
        )}
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}