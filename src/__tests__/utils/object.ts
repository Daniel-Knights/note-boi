import * as n from '../../store/note';
import { EncryptedNote } from '../../classes';
import { hasKeys } from '../../utils';

export function isObj(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null;
}

export function isNote(note: unknown): note is n.Note {
  const nt = note as n.Note;

  return (
    hasKeys(nt, ['id', 'timestamp', 'content']) &&
    typeof nt.id === 'string' &&
    typeof nt.timestamp === 'number' &&
    isObj(nt.content) &&
    hasKeys(nt.content, ['delta', 'title', 'body']) &&
    isObj(nt.content.delta) &&
    typeof nt.content.title === 'string' &&
    typeof nt.content.body === 'string'
  );
}

export function isEncryptedNote(note: unknown): note is EncryptedNote {
  const nt = note;

  if (!isObj(nt) || typeof nt.content !== 'string') {
    return false;
  }

  return isNote({ ...nt, content: { delta: {}, title: '', body: '' } });
}

/**
 * Hack to trigger encryption error. A circular reference that causes `JSON.stringify`
 * to throw when stringifying note content for encryption.
 * Tried every which way to mock reject on `crypto.subtle.encrypt`, but it doesn't work.
 */
export function hackEncryptionError(nt: n.Note) {
  // @ts-expect-error - see function comment
  nt.id = 'id'; // Normalise for snapshot
  nt.timestamp = 0;
  // @ts-expect-error - see function comment
  nt.content = nt;
}
