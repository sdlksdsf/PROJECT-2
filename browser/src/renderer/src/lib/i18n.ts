import { translate, type MessageKey } from '@shared/i18n';
import { useStore } from '../store';

/** Translate a chrome string into the language chosen in Settings → Languages. */
export function useT(): (key: MessageKey, vars?: Record<string, string | number>) => string {
  const language = useStore((state) => state.prefs.system.language);
  return (key, vars) => translate(language, key, vars);
}
