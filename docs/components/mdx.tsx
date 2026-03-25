import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { ExcalidrawDiagram } from './excalidraw-diagram';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ExcalidrawDiagram,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
