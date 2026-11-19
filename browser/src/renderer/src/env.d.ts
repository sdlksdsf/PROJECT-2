/// <reference types="vite/client" />

import type { KimminoApi } from '@shared/types';

declare global {
  interface Window {
    kimmino?: KimminoApi;
  }
  const __KIMMINO_PREVIEW__: boolean | undefined;
}

declare module '*.css';

export {};
