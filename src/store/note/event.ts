export type NoteEventType = 'note-new' | 'note-select' | 'note-change';

/**
 * `addEventListener` wrapper with stronger typing.
 * Adds listener to `document`.
 */
export function addNoteEventListener<T extends NoteEventType>(
  eventType: T,
  cb: (ev: CustomEvent) => void
) {
  return document.addEventListener(eventType, cb as EventListener);
}

/**
 * `removeEventListener` wrapper with stronger typing.
 *  Removes listener from `document`.
 */
export function removeNoteEventListener(
  eventType: NoteEventType,
  cb: (ev: CustomEvent) => void
) {
  return document.removeEventListener(eventType, cb as EventListener);
}

/**
 * `dispatchEvent` wrapper with stronger typing.
 *  Dispatches listener from `document`.
 */
export function dispatchNoteEvent(eventType: NoteEventType): boolean {
  return document.dispatchEvent(new CustomEvent(eventType));
}
