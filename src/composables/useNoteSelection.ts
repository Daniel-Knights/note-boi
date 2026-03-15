import { Note } from '../classes';
import {
  addNoteEventListener,
  findNote,
  findNoteIndex,
  isSelectedNote,
  noteState,
  removeNoteEventListener,
  selectNote,
} from '../store/note';

export function useNoteSelection() {
  // Clear all extra notes and remove event listener
  function clearExtraNotes() {
    noteState.extraSelectedNotes = [];
    removeNoteEventListener('note-select', clearExtraNotes);
  }

  // Single or multiple note selection handler
  function handleNoteSelect(ev: MouseEvent) {
    const target = ev.target as HTMLElement | null;
    const closestNote = target?.closest<HTMLElement>('.note-menu__note');
    const targetNoteUuid = closestNote?.dataset.noteUuid;
    if (!targetNoteUuid) return;

    const hasExtraNotes = noteState.extraSelectedNotes.length > 0;

    // Shift key + click
    if (ev.shiftKey) {
      const targetNoteIndex = findNoteIndex(targetNoteUuid);

      if (targetNoteIndex >= 0) {
        const lastSelectedNote = hasExtraNotes
          ? noteState.extraSelectedNotes[noteState.extraSelectedNotes.length - 1]?.uuid
          : noteState.selectedNote.uuid;
        const selectedNoteIndex = findNoteIndex(lastSelectedNote);

        if (selectedNoteIndex >= 0) {
          const lowestIndex = Math.min(selectedNoteIndex, targetNoteIndex);
          const highestIndex = Math.max(selectedNoteIndex, targetNoteIndex);

          let noteSlice: Note[] = [];

          if (lowestIndex === selectedNoteIndex) {
            noteSlice = noteState.notes.slice(lowestIndex + 1, highestIndex + 1);
          } else if (highestIndex === selectedNoteIndex) {
            // Reverse to ensure correct selection order, `0` = next in queue
            noteSlice = noteState.notes.slice(lowestIndex, highestIndex).reverse();
          }

          const withoutDuplicates = noteSlice.filter((nt) => !isSelectedNote(nt));

          noteState.extraSelectedNotes.push(...withoutDuplicates);

          ev.stopImmediatePropagation(); // Prevent `clearExtraNotes` firing immediately
          addNoteEventListener('note-select', clearExtraNotes);
        }
      }

      return;
    }

    // Ctrl key + click
    if (ev.metaKey || ev.ctrlKey) {
      const alreadySelectedIndex = noteState.extraSelectedNotes.findIndex(
        (nt) => nt?.uuid === targetNoteUuid
      );

      // Deselect
      if (alreadySelectedIndex >= 0) {
        noteState.extraSelectedNotes.splice(alreadySelectedIndex, 1);

        if (noteState.selectedNote.uuid === targetNoteUuid) {
          selectNote(noteState.extraSelectedNotes[0]?.uuid);
        }

        // Select next extra note when current selected note is deselected
      } else if (noteState.selectedNote.uuid === targetNoteUuid && hasExtraNotes) {
        selectNote(noteState.extraSelectedNotes[0]?.uuid);

        noteState.extraSelectedNotes.splice(0, 1);

        // Add to selection
      } else if (noteState.selectedNote.uuid !== targetNoteUuid) {
        const foundNote = findNote(targetNoteUuid);

        if (foundNote) {
          noteState.extraSelectedNotes.push(foundNote);

          addNoteEventListener('note-select', clearExtraNotes);
        }
      }

      return;
    }

    // Single click
    selectNote(targetNoteUuid);
  }

  return {
    clearExtraNotes,
    handleNoteSelect,
  };
}
