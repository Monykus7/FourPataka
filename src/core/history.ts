export interface History<T> { past: T[]; present: T; future: T[] }
export function commit<T>(history: History<T>, next: T, grouped = false): History<T> {
  if (next === history.present) return history;
  return { past: grouped ? history.past : [...history.past, history.present].slice(-80), present: next, future: [] };
}
export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}
export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}
