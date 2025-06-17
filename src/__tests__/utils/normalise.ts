import { EncryptedNote } from '../../classes';
import { Note } from '../../store/note';
import { UUID_REGEX } from '../constant';
import { Call } from '../mock';

import { getDummyNotes } from './dummyNotes';
import { isNote, isObj } from './object';

const staticNoteIds = new Set(getDummyNotes().map((nt) => nt.id));

/** Returns id unchanged if static, otherwise returns `'id'` */
export const normaliseNoteId = (id: string) => (staticNoteIds.has(id) ? id : 'id');

/**
 * Normalises a `Call` by replacing dynamic values and copying object properties to avoid mutation.
 */
export function normaliseCall(call: Call): Call {
  const normalised: Call = { ...call };

  delete normalised.promise;

  if (!isObj(normalised.calledWith)) return normalised;

  normalised.calledWith = { ...call.calledWith };

  if (isNote(normalised.calledWith.note)) {
    normalised.calledWith.note = normaliseNote(normalised.calledWith.note);
  }

  if (Array.isArray(normalised.calledWith.notes)) {
    normalised.calledWith.notes = [...normalised.calledWith.notes].map(normaliseNote);
  }

  if ('body' in normalised.calledWith && typeof normalised.calledWith.body === 'string') {
    const parsedBody = JSON.parse(normalised.calledWith.body);

    if ('notes' in parsedBody) {
      parsedBody.notes = (parsedBody.notes as EncryptedNote[]).map((nt) => ({
        ...nt,
        id: normaliseNoteId(nt.id),
        timestamp: 0,
        content: 'content',
      }));
    }

    if ('deleted_note_ids' in parsedBody) {
      parsedBody.deleted_note_ids = (parsedBody.deleted_note_ids as string[]).map(
        normaliseNoteId
      );
    }

    normalised.calledWith.body = JSON.stringify(parsedBody);
  }

  if (
    typeof normalised.calledWith.id === 'string' &&
    UUID_REGEX.test(normalised.calledWith.id)
  ) {
    normalised.calledWith.id = normaliseNoteId(normalised.calledWith.id);
  }

  return normalised;
}

/**
 * Normalises a `Note` by:
 * - Spreading object properties to avoid mutation
 * - Normalising the `id` using `normaliseNoteId`
 * - Setting the `timestamp` to `0`
 */
export function normaliseNote(nt: Note): Note {
  return {
    ...nt,
    content: {
      ...nt.content,
      delta: { ...nt.content.delta },
      title: nt.content.title,
      body: nt.content.body,
    },
    id: normaliseNoteId(nt.id),
    timestamp: 0,
  };
}

/**
 * Normalises an `EncryptedNote` by:
 * - Spreading object properties to avoid mutation
 * - Normalising the `id` using `normaliseNoteId`
 * - Replacing encrypted content with `'content'`
 */
export function normaliseEncryptedNote(nt: EncryptedNote): EncryptedNote {
  return {
    ...nt,
    content: 'content',
    id: normaliseNoteId(nt.id),
  };
}
