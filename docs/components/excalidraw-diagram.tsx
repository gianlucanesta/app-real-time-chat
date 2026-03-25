'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false },
);

const BG = '#1a1b26';

interface ExcalidrawDiagramProps {
  /** Path relative to /public/diagrams/, e.g. "architecture-overview" */
  name: string;
  /** Optional height in px (default 500) */
  height?: number;
  /** Optional caption below the diagram */
  caption?: string;
}

export function ExcalidrawDiagram({
  name,
  height = 500,
  caption,
}: ExcalidrawDiagramProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scene, setScene] = useState<any>(null);
  const [error, setError] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [api, setApi] = useState<any>(null);

  useEffect(() => {
    fetch(`/diagrams/${name}.excalidraw`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setScene)
      .catch(() => setError(true));
  }, [name]);

  // Fit all elements into view once both the API and scene are ready
  useEffect(() => {
    if (!api || !scene?.elements?.length) return;
    const id = setTimeout(() => {
      api.scrollToContent(api.getSceneElements(), {
        fitToContent: true,
        animate: false,
      });
    }, 80);
    return () => clearTimeout(id);
  }, [api, scene]);

  const handleApi = useCallback((instance: unknown) => setApi(instance), []);

  if (error) {
    return (
      <div className="rounded-lg border border-fd-border bg-fd-muted/50 p-8 text-center text-fd-muted-foreground">
        Diagram not found: <code>{name}</code>
      </div>
    );
  }

  if (!scene) {
    return (
      <div
        className="rounded-lg border border-fd-border animate-pulse"
        style={{ height, background: BG }}
      />
    );
  }

  return (
    <figure className="my-6 not-prose">
      <div
        className="rounded-lg border border-fd-border overflow-hidden"
        style={{ height, background: BG }}
      >
        <Excalidraw
          excalidrawAPI={handleApi as any}
          initialData={{
            elements: scene.elements,
            appState: {
              viewModeEnabled: true,
              zenModeEnabled: false,
              gridModeEnabled: false,
              theme: 'dark',
              viewBackgroundColor: BG,
            },
            files: scene.files ?? {},
          }}
          viewModeEnabled
          zenModeEnabled={false}
          gridModeEnabled={false}
          theme="dark"
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
