'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false },
);

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

  useEffect(() => {
    fetch(`/diagrams/${name}.excalidraw`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setScene)
      .catch(() => setError(true));
  }, [name]);

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
        className="rounded-lg border border-fd-border bg-fd-muted/30 animate-pulse"
        style={{ height }}
      />
    );
  }

  return (
    <figure className="my-6 not-prose">
      <div
        className="rounded-lg border border-fd-border overflow-hidden bg-white"
        style={{ height }}
      >
        <Excalidraw
          initialData={{
            elements: scene.elements,
            appState: {
              ...scene.appState,
              viewModeEnabled: true,
              zenModeEnabled: true,
              gridModeEnabled: false,
            },
            files: scene.files,
          }}
          viewModeEnabled
          zenModeEnabled
          gridModeEnabled={false}
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
