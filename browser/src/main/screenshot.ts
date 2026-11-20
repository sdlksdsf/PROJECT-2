import { clipboard, nativeImage, shell, type WebContents } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { screenshotsDir } from './profiles';
import type { CaptureMode, CaptureResult, Preferences } from '../shared/types';

/**
 * Screenshot capture — visible area, full page (via CDP so it works on pages
 * taller than the window) or a user-dragged region. Saves straight to a
 * "Kimmino Screenshots" folder and copies to the clipboard.
 */
export async function capture(wc: WebContents, mode: CaptureMode, prefs: Preferences): Promise<CaptureResult> {
  try {
    let buffer: Buffer;
    if (mode === 'fullpage') {
      buffer = await captureFullPage(wc);
    } else if (mode === 'selection') {
      const rect = await askForSelection(wc);
      if (!rect) return { ok: false, error: 'Selection cancelled' };
      const image = await wc.capturePage({
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height))
      });
      buffer = image.toPNG();
    } else {
      const image = await wc.capturePage();
      buffer = image.toPNG();
    }

    const format = prefs.productivity.screenshotFormat;
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    // Millisecond precision: two captures in the same second used to overwrite
    // each other, so the second screenshot silently replaced the first.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 23);
    const host = hostOf(wc.getURL()) || 'page';
    const file = path.join(screenshotsDir(), `${host}-${stamp}.${ext}`);

    let output = buffer;
    if (format === 'jpeg') {
      const image = nativeImage.createFromBuffer(buffer);
      output = image.toJPEG(92);
    }
    fs.writeFileSync(file, output);
    // Clipboard failure is not capture failure. On Linux/Wayland the clipboard
    // is frequently unavailable; reporting the whole screenshot as broken made
    // it look like the feature did not work.
    let copied = true;
    try {
      // Electron 45 ships a W3C-style async clipboard type definition; the the
      // main-process image API is still the classic synchronous one.
      (clipboard as unknown as { writeImage: (image: Electron.NativeImage) => void }).writeImage(
        nativeImage.createFromBuffer(output)
      );
    } catch {
      copied = false;
    }

    // The preview must describe the bytes we actually saved, or the browser
    // hands a JPEG payload to an <img> tag labelled PNG.
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return {
      ok: true,
      path: file,
      copied,
      dataUrl: `data:${mime};base64,${output.toString('base64')}`
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function saveSelection(dataUrl: string, prefs: Preferences): Promise<CaptureResult> {
  try {
    const base64 = dataUrl.split(',')[1] ?? '';
    const buffer = Buffer.from(base64, 'base64');
    const ext = prefs.productivity.screenshotFormat === 'jpeg' ? 'jpg' : 'png';
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 23);
    const file = path.join(screenshotsDir(), `selection-${stamp}.${ext}`);
    fs.writeFileSync(file, buffer);
    // Electron 45 ships a W3C-style async clipboard type definition; the
    // main-process image API is still the classic synchronous one.
    (clipboard as unknown as { writeImage: (image: Electron.NativeImage) => void }).writeImage(
      nativeImage.createFromBuffer(buffer)
    );
    return { ok: true, path: file, dataUrl };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export function revealScreenshot(file: string): void {
  shell.showItemInFolder(file);
}

async function captureFullPage(wc: WebContents): Promise<Buffer> {
  const dbg = wc.debugger;
  const wasAttached = dbg.isAttached();
  if (!wasAttached) dbg.attach('1.3');
  try {
    const metrics = (await dbg.sendCommand('Page.getLayoutMetrics')) as {
      cssContentSize?: { width: number; height: number };
      contentSize?: { width: number; height: number };
    };
    const size = metrics.cssContentSize ?? metrics.contentSize ?? { width: 1280, height: 800 };
    const width = Math.min(Math.ceil(size.width), 8000);
    const height = Math.min(Math.ceil(size.height), 20000);
    const result = (await dbg.sendCommand('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 }
    })) as { data: string };
    return Buffer.from(result.data, 'base64');
  } finally {
    if (!wasAttached) {
      try {
        dbg.detach();
      } catch {
        /* ignore */
      }
    }
  }
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Draws a crosshair + rubber band and resolves with the dragged rectangle. */
async function askForSelection(wc: WebContents): Promise<Rect | null> {
  const script = `(() => new Promise((resolve) => {
    const layer = document.createElement('div');
    layer.style.cssText = 'position:fixed;inset:0;z-index:2147483647;cursor:crosshair;background:rgba(8,10,16,.28);';
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;border:2px solid #6d8cff;background:rgba(109,140,255,.16);border-radius:6px;display:none;pointer-events:none;';
    const hint = document.createElement('div');
    hint.textContent = 'Drag to capture · Esc to cancel';
    hint.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);background:#11151d;color:#eef1f7;font:600 13px Inter,system-ui,sans-serif;padding:8px 14px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.35);';
    layer.append(box, hint);
    document.documentElement.appendChild(layer);
    let startX = 0, startY = 0, active = false;
    const cleanup = () => { layer.remove(); document.removeEventListener('keydown', onKey, true); };
    const onKey = (event) => { if (event.key === 'Escape') { cleanup(); resolve(null); } };
    document.addEventListener('keydown', onKey, true);
    layer.addEventListener('mousedown', (event) => {
      active = true; startX = event.clientX; startY = event.clientY;
      box.style.display = 'block';
      event.preventDefault();
    });
    layer.addEventListener('mousemove', (event) => {
      if (!active) return;
      const x = Math.min(startX, event.clientX), y = Math.min(startY, event.clientY);
      box.style.left = x + 'px'; box.style.top = y + 'px';
      box.style.width = Math.abs(event.clientX - startX) + 'px';
      box.style.height = Math.abs(event.clientY - startY) + 'px';
    });
    layer.addEventListener('mouseup', (event) => {
      if (!active) return;
      const rect = {
        x: Math.min(startX, event.clientX),
        y: Math.min(startY, event.clientY),
        width: Math.abs(event.clientX - startX),
        height: Math.abs(event.clientY - startY)
      };
      cleanup();
      resolve(rect.width > 4 && rect.height > 4 ? rect : null);
    });
  }))()`;
  const result = (await wc.executeJavaScript(script, true)) as Rect | null;
  return result;
}

function hostOf(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
