export function typingDuration(text) {
  return Math.min(650, Math.max(170, Array.from(text).length * 12));
}
