'use client';

import { useEffect, useState } from 'react';

const BG = '#1a1b26';

interface ExcalidrawDiagramProps {
  name: string;
  height?: number;
  caption?: string;
}

/**
 * Renders an Excalidraw diagram as a static SVG using `exportToSvg`.
 *
 * The generated SVG string is stored in React state and rendered via
 * `dangerouslySetInnerHTML` so React owns the DOM tree. Previous versions
 * inserted the SVG imperatively (`replaceChildren`) and then triggered a
 * re-render with `setStatus('ready')` — React's reconciliation would then
 * wipe the imperatively-added node because it didn't exist in the virtual DOM,
 * causing the diagram to blank out after ~1-2 seconds.
 */
export function ExcalidrawDiagram({
  name,
  height = 500,
  caption,
}: ExcalidrawDiagramProps) {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/diagrams/${name}.excalidraw`);
        if (!res.ok) throw new Error(`Diagram ${name} not found`);
        const scene = await res.json();

        const { exportToSvg } = await import('@excalidraw/excalidraw');

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

        if (cancelled) return;

        // Make the SVG responsive
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');

        // Store as string so React manages the DOM — no imperative conflict
        setSvgHtml(svg.outerHTML);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [name, height]);

  if (error) {
    return (
      <div className="rounded-lg border border-fd-border bg-fd-muted/50 p-8 text-center text-fd-muted-foreground">
        Diagram not found: <code>{name}</code>
      </div>
    );
  }

  return (
    <figure className="my-6 not-prose">
      <div
        className="rounded-lg border border-fd-border overflow-hidden"
        style={{ height, background: BG }}
      >
        {svgHtml ? (
          <div
            dangerouslySetInnerHTML={{ __html: svgHtml }}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        ) : (
          <div
            className="animate-pulse"
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
