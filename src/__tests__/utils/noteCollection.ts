import { EncryptedNote } from '../../classes';

export class NoteCollection {
  notes;

  constructor(notes: EncryptedNote[]) {
    this.notes = notes;
  }

  sortByTimestamp() {
    this.notes.sort((a, b) => a.timestamp - b.timestamp);

    return this;
  }

  merge(notesRight: NoteCollection, deletedIds: Set<string>) {
    // Handle if either side is empty
    if (notesRight.notes.length === 0) {
      return this;
    }

    if (this.notes.length === 0) {
      return notesRight.sortByTimestamp();
    }

    // Merge notes
    const mergedNotes = new Set<EncryptedNote>();

    // Left
    for (const nl of this.notes) {
      if (deletedIds.has(nl.id)) {
        continue;
      }

      const nr = notesRight.notes.find((n) => n.id === nl.id);

      if (nr) {
        mergedNotes.add(nl.timestamp > nr.timestamp ? nl : nr);
      } else {
        mergedNotes.add(nl);
      }
    }

    // Right
    for (const nr of notesRight.notes) {
      if (deletedIds.has(nr.id) || this.notes.some((nl) => nl.id === nr.id)) {
        continue;
      }

      mergedNotes.add(nr);
    }

    return new NoteCollection([...mergedNotes]).sortByTimestamp();
  }
}
