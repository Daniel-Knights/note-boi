import * as n from '../../../../store/note';
import { Note } from '../../../../classes';
import { mockApi } from '../../../mock';

import { existingNote, existingNoteIndexSorted } from './setup';

describe('utils', () => {
  it('findNoteIndex', async () => {
    mockApi();

    await n.getAllNotes();

    const index = n.findNoteIndex(existingNote.uuid);

    assert.strictEqual(index, existingNoteIndexSorted);
    assert.strictEqual(n.findNoteIndex(), -1);
  });

  it('findNote', async () => {
    mockApi();

    await n.getAllNotes();

    const foundNote = n.findNote(existingNote.uuid);

    assert.isDefined(foundNote);
    assert.strictEqual(foundNote!.uuid, existingNote.uuid);
    assert.isUndefined(n.findNote(new Note().uuid));
  });

  it('isSelectedNote', async () => {
    mockApi();

    await n.getAllNotes();

    n.selectNote(existingNote.uuid);

    assert.isTrue(n.isSelectedNote(existingNote));

    const emptyNote = new Note();

    n.noteState.notes.push(emptyNote);
    n.selectNote(emptyNote.uuid);

    assert.isTrue(n.isSelectedNote(emptyNote));
    assert.isFalse(n.isSelectedNote(existingNote));
  });
});
