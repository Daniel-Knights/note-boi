import type { Note } from './store';

/** Formats Unix time to date-time. */
export function unixToDateTime(unixTime: number): string {
  return Intl.DateTimeFormat([], {
    dateStyle: 'medium',
    timeStyle: process.env.NODE_ENV === 'development' ? 'long' : 'short',
  }).format(unixTime);
}

/** Returns `true` if string consists of only whitespace characters or is empty. */
export function isWhitespaceOnly(text?: string): boolean {
  return text?.trim() === '';
}

/** Returns true if note content is empty. */
export function isEmptyNote(note: Note): boolean {
  return isWhitespaceOnly(note.content.title);
}
