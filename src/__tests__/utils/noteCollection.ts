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
    const deletedNotesMap = new Map(deletedNotes.map((dn) => [dn.uuid, dn]));
    const notesRightMap = new Map(notesRight.notes.map((n) => [n.uuid, n]));

    // Left
    for (const nl of this.notes) {
      const deletedAt = deletedNotesMap.get(nl.uuid)?.deleted_at ?? -1;

      if (deletedAt >= nl.timestamp) {
        continue;
      }

      const nr = notesRightMap.get(nl.uuid);

      if (nr) {
        if (nl.timestamp > nr.timestamp) {
          mergedNotesMap.set(nl.uuid, nl);
          diff.edited.push(nl);
        } else {
          mergedNotesMap.set(nr.uuid, nr);
        }
      } else {
        mergedNotesMap.set(nl.uuid, nl);
        diff.added.push(nl);
      }
    }

    // Right
    for (const nr of notesRight.notes) {
      if (mergedNotesMap.has(nr.uuid)) {
        continue;
      }

      const deletedNote = deletedNotesMap.get(nr.uuid);

      if (deletedNote && deletedNote.deleted_at >= nr.timestamp) {
        diff.deleted.push(deletedNote);

        continue;
      }

      mergedNotesMap.set(nr.uuid, nr);
    }

    this.notes = [...mergedNotesMap.values()].sort((a, b) => a.timestamp - b.timestamp);

    return diff;
  }
}
