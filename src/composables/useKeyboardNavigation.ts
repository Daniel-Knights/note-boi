import { onBeforeUnmount, ref } from 'vue';

import { findNoteIndex, noteState, selectNote } from '../store/note';

export function useKeyboardNavigation(clearExtraNotes: () => void) {
  const listIsFocused = ref(true);

  // Navigate notes with up/down arrow keys
  function navigateWithArrowKeys(ev: KeyboardEvent) {
    if (!listIsFocused.value) return;

    ev.preventDefault(); // Prevents noise on Mac

    const keyDirection = {
      ArrowUp: 1,
      ArrowDown: -1,
    };

    const directionIndex: number | undefined =
      keyDirection[ev.key as keyof typeof keyDirection];

    if (directionIndex) {
      const lastSelectedNoteUuid =
        noteState.extraSelectedNotes[0]?.uuid || noteState.selectedNote.uuid;
      // Index of the note we're selecting
      const toIndex = findNoteIndex(lastSelectedNoteUuid) - directionIndex;

      selectNote(noteState.notes[toIndex]?.uuid);
      clearExtraNotes();
    }
  }

  // Register list blur
  function handleWindowClick(ev: MouseEvent) {
    if (!(ev.target as HTMLElement)?.closest('#note-menu')) {
      listIsFocused.value = false;
    }
  }

  window.addEventListener('click', handleWindowClick);
  window.addEventListener('keydown', navigateWithArrowKeys);

  onBeforeUnmount(() => {
    window.removeEventListener('click', handleWindowClick);
    window.removeEventListener('keydown', navigateWithArrowKeys);
  });

  return {
    listIsFocused,
  };
}
