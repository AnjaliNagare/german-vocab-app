const ARTICLE = /^(der|die|das)\s+(.+)$/i;

export function splitArticle(text = '') {
  const match = text.trim().match(ARTICLE);
  if (!match) return { article: null, noun: text.trim() };
  return { article: match[1].toLowerCase(), noun: match[2] };
}

export function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-DE';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

export function formatInterval(days) {
  if (days <= 1) return '1 day';
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}