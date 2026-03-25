'use client';

import { useEffect, useMemo, useState } from 'react';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildInitialData(scene: any, height: number) {
  const elements: any[] = scene?.elements ?? [];
  const baseState = {
    viewModeEnabled: true,
    zenModeEnabled: false,
    gridModeEnabled: false,
    theme: 'dark' as const,
    viewBackgroundColor: BG,
  };

  if (!elements.length) {
    return { elements, appState: baseState, files: scene?.files ?? {} };
  }

  // Compute element bounding box so the diagram is centred on first paint
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const x = el.x ?? 0, y = el.y ?? 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + (el.width ?? 0));
    maxY = Math.max(maxY, y + (el.height ?? 0));
  }

  const elW = Math.max(maxX - minX, 1);
  const elH = Math.max(maxY - minY, 1);
  const pad = 48;
  // Use a typical docs column width; close enough for initial positioning
  const vpW = 860;
  const vpH = height;

  const zoom = Math.min((vpW - pad * 2) / elW, (vpH - pad * 2) / elH, 1.5);
  const scrollX = (vpW - elW * zoom) / 2 - minX * zoom;
  const scrollY = (vpH - elH * zoom) / 2 - minY * zoom;

  return {
    elements,
    appState: { ...baseState, zoom: { value: zoom }, scrollX, scrollY },
    files: scene?.files ?? {},
  };
}

export function ExcalidrawDiagram({ name, height = 500, caption }: ExcalidrawDiagramProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scene, setScene] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/diagrams/' + name + '.excalidraw')
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setScene)
      .catch(() => setError(true));
  }, [name]);

  // Memoised so Excalidraw always receives the same object reference after the
  // scene loads — a new reference would trigger internal re-initialisation and
  // blank the canvas.
  const initialData = useMemo(
    () => (scene ? buildInitialData(scene, height) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scene],
  );

  if (error) {
    return (
      <div className="rounded-lg border border-fd-border bg-fd-muted/50 p-8 text-center text-fd-muted-foreground">
        Diagram not found: <code>{name}</code>
      </div>
    );
  }

  if (!initialData) {
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
          initialData={initialData}
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