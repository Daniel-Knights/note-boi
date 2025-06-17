import { EncryptedNote } from '../../classes';

export class NoteCollection {
  notes;

  constructor(notes: EncryptedNote[]) {
    this.notes = notes;
  }

  merge(notesRight: NoteCollection, deletedIds: Set<string>) {
    const mergedNotes = new Set<EncryptedNote>();

    const diff = {
      added: [] as EncryptedNote[],
      edited: [] as EncryptedNote[],
      deleted_ids: [] as string[],
    };

    // Left
    for (const nl of this.notes) {
      if (deletedIds.has(nl.id)) {
        continue;
      }

      const nr = notesRight.notes.find((n) => n.id === nl.id);

      if (nr) {
        if (nl.timestamp > nr.timestamp) {
          mergedNotes.add(nl);
          diff.edited.push(nl);
        } else {
          mergedNotes.add(nr);
        }
      } else {
        mergedNotes.add(nl);
        diff.added.push(nl);
      }
    }

    // Right
    for (const nr of notesRight.notes) {
      if ([...mergedNotes].some((nl) => nl.id === nr.id)) {
        continue;
      }

      if (deletedIds.has(nr.id)) {
        diff.deleted_ids.push(nr.id);

        continue;
      }

      mergedNotes.add(nr);
    }

    this.notes = new NoteCollection([...mergedNotes]).sortByTimestamp().notes;

    return diff;
  }

  sortByTimestamp() {
    this.notes.sort((a, b) => a.timestamp - b.timestamp);

    return this;
  }
}
