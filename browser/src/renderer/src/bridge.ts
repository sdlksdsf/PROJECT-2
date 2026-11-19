import type { KimminoApi } from '@shared/types';
import { createMockApi } from './bridge.mock';

const native = typeof window !== 'undefined' ? window.kimmino : undefined;

/** True inside the packaged Electron app, false in the browser preview. */
export const isNative = Boolean(native?.isNative);

export const api: KimminoApi = native ?? createMockApi();

export const platform = api.platform;
export const isMac = platform === 'darwin';
