/**
 * Extractive summariser used by the offline AI mode in the UI preview.
 * The native app runs the fuller version in the main process.
 */
const STOPWORDS = new Set(
  'a an the and or but if while of to in on for with without at by from as is are was were be been being this that these those it its you your we our they their he she his her not no do does did have has had can could should would may might will just than then so such about into over under again more most other some any'.split(
    /\s+/
  )
);

export function offlineSummary(text: string, maxSentences = 5): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Nothing to summarise.';
  const sentences = clean
    .split(/(?<=[.!?])\s+(?=[A-Z"“])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40 && sentence.length < 400)
    .slice(0, 200);
  if (sentences.length <= maxSentences) return sentences.join(' ') || clean.slice(0, 400);

  const freq = new Map<string, number>();
  for (const word of clean.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []) {
    if (STOPWORDS.has(word)) continue;
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  const scored = sentences.map((sentence, index) => {
    const words = sentence.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [];
    let score = 0;
    for (const word of words) score += freq.get(word) ?? 0;
    score /= Math.sqrt(words.length || 1);
    if (index < 2) score *= 1.25;
    return { sentence, score, index };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(' ');
}
