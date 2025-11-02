import * as n from '../../../../store/note';
import { Note } from '../../../../classes';
import { isEmptyNote } from '../../../../utils';
import { getDummyNotes } from '../../../utils';

describe('state', () => {
  describe('addNotes', () => {
    it('Adds new notes to empty state', () => {
      const dummyNotes = getDummyNotes();
      const notesToAdd = [dummyNotes[0]!, dummyNotes[1]!];

      n.noteState.addNotes(notesToAdd);

      assert.strictEqual(n.noteState.notes.length, 2);
      assert.strictEqual(n.noteState.notes[0]?.uuid, notesToAdd[0]!.uuid);
      assert.strictEqual(n.noteState.notes[1]?.uuid, notesToAdd[1]!.uuid);
    });

    it('Adds notes to existing state', () => {
      const dummyNotes = getDummyNotes();
      const existingNotes = [dummyNotes[0]!, dummyNotes[1]!];
      const newNotes = [dummyNotes[2]!, dummyNotes[3]!, dummyNotes[4]!];

      // Add existing notes first
      n.noteState.addNotes(existingNotes);
      assert.strictEqual(n.noteState.notes.length, 2);

      // Add new notes
      n.noteState.addNotes(newNotes);
      assert.strictEqual(n.noteState.notes.length, 5);

      // Check all notes are present and sorted
      assert.strictEqual(n.noteState.notes[0]?.uuid, newNotes[2]!.uuid);
      assert.strictEqual(n.noteState.notes[1]?.uuid, existingNotes[0]!.uuid);
      assert.strictEqual(n.noteState.notes[2]?.uuid, existingNotes[1]!.uuid);
      assert.strictEqual(n.noteState.notes[3]?.uuid, newNotes[0]!.uuid);
      assert.strictEqual(n.noteState.notes[4]?.uuid, newNotes[1]!.uuid);
    });

    it('Filters out duplicate notes by uuid', () => {
      const dummyNotes = getDummyNotes();
      const originalNote = dummyNotes[0]!;
      const duplicateNote = new Note({
        ...originalNote,
        content: { ...originalNote.content, title: 'Modified Title' },
      });

      // Add original note
      n.noteState.addNotes([originalNote]);
      assert.strictEqual(n.noteState.notes.length, 1);

      // Try to add duplicate
      n.noteState.addNotes([duplicateNote]);

      // Should still only have one note (the original is removed, duplicate is added)
      assert.strictEqual(n.noteState.notes.length, 1);
      assert.strictEqual(n.noteState.notes[0]!.uuid, originalNote.uuid);
      assert.strictEqual(n.noteState.notes[0]!.content.title, 'Modified Title');
    });

    it('Handles mixed duplicates and new notes', () => {
      const dummyNotes = getDummyNotes();
      const existingNote = dummyNotes[0]!;
      const newNote = dummyNotes[1]!;
      const duplicateNote = new Note({
        ...existingNote,
        content: { ...existingNote.content, title: 'Updated' },
      });

      // Add existing note
      n.noteState.addNotes([existingNote]);
      assert.strictEqual(n.noteState.notes.length, 1);

      // Add mix of duplicate and new
      n.noteState.addNotes([duplicateNote, newNote]);

      assert.strictEqual(n.noteState.notes.length, 2);
      assert.deepEqual(n.noteState.notes[0], duplicateNote);
      assert.deepEqual(n.noteState.notes[1]?.uuid, newNote.uuid);
    });

    it('Does not select latest note by default', () => {
      const dummyNotes = getDummyNotes();
      const notesToAdd = [dummyNotes[0]!, dummyNotes[1]!];

      n.noteState.addNotes(notesToAdd);

      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
    });

    it('Selects latest note when selectLatest option is true', () => {
      const dummyNotes = getDummyNotes();
      const notesToAdd = [dummyNotes[3]!, dummyNotes[4]!];

      n.noteState.addNotes(notesToAdd, { selectLatest: true });

      assert.strictEqual(n.noteState.selectedNote.uuid, notesToAdd[1]!.uuid);
    });

    it('Handles empty array gracefully', () => {
      const initialLength = n.noteState.notes.length;

      n.noteState.addNotes([]);

      assert.strictEqual(n.noteState.notes.length, initialLength);
    });

    it('Handles selectLatest option with empty array', () => {
      n.noteState.addNotes([], { selectLatest: true });

      assert.strictEqual(n.noteState.notes.length, 0);
    });
  });
});
