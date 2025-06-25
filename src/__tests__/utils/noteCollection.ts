import { DeletedNote, NoteDiff } from '../../api';
import { EncryptedNote } from '../../classes';

export class NoteCollection {
  notes;

  constructor(notes: EncryptedNote[]) {
    this.notes = notes;
  }

  merge(notesRight: NoteCollection, deletedNotes: DeletedNote[]) {
    const mergedNotesMap = new Map<string, EncryptedNote>();
    const diff: NoteDiff = { added: [], edited: [], deleted: [] };
    const deletedNotesMap = new Map(deletedNotes.map((dn) => [dn.id, dn]));
    const notesRightMap = new Map(notesRight.notes.map((n) => [n.id, n]));

    // Left
    for (const nl of this.notes) {
      const deletedAt = deletedNotesMap.get(nl.id)?.deleted_at ?? -1;

      if (deletedAt >= nl.timestamp) {
        continue;
      }

      const nr = notesRightMap.get(nl.id);

      if (nr) {
        if (nl.timestamp > nr.timestamp) {
          mergedNotesMap.set(nl.id, nl);
          diff.edited.push(nl);
        } else {
          mergedNotesMap.set(nr.id, nr);
        }
      } else {
        mergedNotesMap.set(nl.id, nl);
        diff.added.push(nl);
      }
    }

    // Right
    for (const nr of notesRight.notes) {
      if (mergedNotesMap.has(nr.id)) {
        continue;
      }

      const deletedNote = deletedNotesMap.get(nr.id);

      if (deletedNote && deletedNote.deleted_at >= nr.timestamp) {
        diff.deleted.push(deletedNote);

        continue;
      }

      mergedNotesMap.set(nr.id, nr);
    }

    this.notes = [...mergedNotesMap.values()].sort((a, b) => a.timestamp - b.timestamp);

    return diff;
  }
}
