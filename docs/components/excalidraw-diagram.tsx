'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false },
);

const BG = '#1a1b26';

interface ExcalidrawDiagramProps {
  name: string;
  height?: number;
  caption?: string;
}

export function ExcalidrawDiagram({ name, height = 500, caption }: ExcalidrawDiagramProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scene, setScene] = useState<any>(null);
  const [error, setError] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);

  useEffect(() => {
    fetch('/diagrams/' + name + '.excalidraw')
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setScene)
      .catch(() => setError(true));
  }, [name]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fitToContent = (api: any) => {
    const els = api?.getSceneElements?.();
    if (!els?.length) return;
    setTimeout(() => {
      api.scrollToContent(els, { fitToContent: true, animate: false });
    }, 60);
  };

  // Called by Excalidraw with its imperative API — using a ref avoids a
  // re-render cycle that would blank out the canvas.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleApi = (api: any) => {
    apiRef.current = api;
    fitToContent(api);
  };

  // Fallback: if the scene arrived after the API was already ready
  useEffect(() => {
    if (scene && apiRef.current) {
      fitToContent(apiRef.current);
    }
  }, [scene]);

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
          excalidrawAPI={handleApi}
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