import { dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { JsonStore } from './store';
import { BUILTIN_THEMES } from '../shared/defaults';
import type { ThemeDefinition } from '../shared/types';

const REQUIRED_COLORS = ['bg', 'surface', 'chrome', 'text', 'muted', 'border', 'accent'];

/**
 * Discord-style theming: a theme is a small JSON file with colour tokens.
 * Anything matching the schema can be imported, shared or shipped as a .kimtheme.
 */
export class ThemeService {
  private store: JsonStore<ThemeDefinition[]>;

  constructor(dir: string) {
    this.store = new JsonStore<ThemeDefinition[]>('themes.json', () => [], dir);
  }

  list(): ThemeDefinition[] {
    return [...BUILTIN_THEMES, ...this.store.get()];
  }

  get(id: string): ThemeDefinition | undefined {
    return this.list().find((t) => t.id === id);
  }

  validate(input: unknown): ThemeDefinition {
    if (!input || typeof input !== 'object') throw new Error('Theme file is not an object.');
    const raw = input as Partial<ThemeDefinition>;
    if (!raw.colors || typeof raw.colors !== 'object') throw new Error('Theme is missing a "colors" object.');
    const colors: Record<string, string> = {};
    for (const key of REQUIRED_COLORS) {
      const value = (raw.colors as Record<string, string>)[key];
      if (!value || typeof value !== 'string') throw new Error(`Theme is missing the "${key}" colour.`);
      colors[key] = value;
    }
    for (const [key, value] of Object.entries(raw.colors)) {
      if (typeof value === 'string') colors[key] = value;
    }
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : `custom_${Date.now().toString(36)}`,
      name: typeof raw.name === 'string' && raw.name ? raw.name : 'Untitled theme',
      author: typeof raw.author === 'string' ? raw.author : 'Unknown',
      version: typeof raw.version === 'string' ? raw.version : '1.0.0',
      isDark: Boolean(raw.isDark ?? true),
      builtin: false,
      fontFamily: typeof raw.fontFamily === 'string' ? raw.fontFamily : undefined,
      colors
    };
  }

  save(theme: ThemeDefinition): void {
    const validated = this.validate(theme);
    this.store.update((list) => {
      const rest = list.filter((t) => t.id !== validated.id);
      return [...rest, validated];
    });
    this.store.flush();
  }

  remove(id: string): void {
    this.store.update((list) => list.filter((t) => t.id !== id));
    this.store.flush();
  }

  async importFile(): Promise<ThemeDefinition | null> {
    const result = await dialog.showOpenDialog({
      title: 'Import a Kimmino theme',
      filters: [{ name: 'Kimmino theme', extensions: ['json', 'kimtheme'] }],
      properties: ['openFile']
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const raw = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8')) as unknown;
    const theme = this.validate(raw);
    this.save(theme);
    return theme;
  }

  async exportCurrent(theme: ThemeDefinition): Promise<string | null> {
    const result = await dialog.showSaveDialog({
      title: 'Export theme',
      defaultPath: `${theme.name.replace(/\s+/g, '-').toLowerCase()}.kimtheme.json`,
      filters: [{ name: 'Kimmino theme', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return null;
    fs.writeFileSync(result.filePath, JSON.stringify(theme, null, 2), 'utf8');
    return result.filePath;
  }

  /** Starter theme offered in the UI so people can copy and edit. */
  exampleTheme(dir: string): string {
    const file = path.join(dir, 'example-theme.json');
    if (!fs.existsSync(file)) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        file,
        JSON.stringify(
          {
            name: 'Midnight Mint',
            author: 'you',
            version: '1.0.0',
            isDark: true,
            colors: {
              bg: '#08110f',
              surface: '#0d1a17',
              chrome: '#091412',
              text: '#e8fff8',
              muted: '#84a89c',
              border: '#173029',
              accent: '#3ddc97'
            }
          },
          null,
          2
        ),
        'utf8'
      );
    }
    return file;
  }
}
