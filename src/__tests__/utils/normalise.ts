import { DeletedNote } from '../../api';
import { EncryptedNote, Note, RawNote } from '../../classes';
import { UUID_REGEX } from '../../constant';
import { Call } from '../mock';

import { getDummyNotes } from './dummyNotes';
import { isNote, isObj } from './object';

const staticNoteUuids = new Set(getDummyNotes().map((nt) => nt.uuid));

/** Returns uuid unchanged if static, otherwise returns `'uuid'` */
export function normaliseNoteUuid(uuid: string) {
  return staticNoteUuids.has(uuid) ? uuid : 'uuid';
}

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
        uuid: normaliseNoteUuid(nt.uuid),
        timestamp: 0,
        content: 'content',
      }));
    }

    if ('deleted_notes' in parsedBody) {
      parsedBody.deleted_notes = (parsedBody.deleted_notes as DeletedNote[]).map(
        (dn) => ({ ...dn, uuid: normaliseNoteUuid(dn.uuid), deleted_at: 0 })
      );
    }

    normalised.calledWith.body = JSON.stringify(parsedBody);
  }

  if (
    typeof normalised.calledWith.uuid === 'string' &&
    UUID_REGEX.test(normalised.calledWith.uuid)
  ) {
    normalised.calledWith.uuid = normaliseNoteUuid(normalised.calledWith.uuid);
  }

  return normalised;
}

/**
 * Normalises a `Note` ready to be output for snapshots.
 */
export function normaliseNote(nt: RawNote): Note {
  return new Note({
    ...nt,
    uuid: normaliseNoteUuid(nt.uuid),
    timestamp: 0,
    content: {
      ...nt.content,
      delta: { ...nt.content.delta },
      title: nt.content.title,
      body: nt.content.body,
    },
  });
}

/**
 * Normalises an `EncryptedNote` ready to be output for snapshots.
 */
export function normaliseEncryptedNote(nt: EncryptedNote): EncryptedNote {
  return {
    ...nt,
    uuid: normaliseNoteUuid(nt.uuid),
    timestamp: 0,
    content: 'content',
  };
}
