import { shallowMount } from '@vue/test-utils';

import NoteMenu from '../../components/NoteMenu.vue';
import { getByTestId, resetNoteStore, setCrypto } from '../utils';
import { mockTauriApi } from '../tauri';
import * as noteStore from '../../store/note';
import localNotes from '../notes.json';
import { isEmptyNote } from '../../utils';

beforeAll(setCrypto);

describe('NoteMenu', () => {
  it('Mounts', () => {
    const wrapper = shallowMount(NoteMenu);
    assert.isTrue(wrapper.isVisible());
  });

  it('Renders a list item for every note', async () => {
    const wrapper = shallowMount(NoteMenu);
    assert.isTrue(wrapper.isVisible());

    await mockTauriApi(localNotes);
    await noteStore.getAllNotes();

    assert.strictEqual(wrapper.findAll('li').length, localNotes.length);

    noteStore.state.notes.forEach((note) => {
      const noteItem = wrapper.find(`li[data-note-id="${note.id}"]`);

      assert.isTrue(noteItem.exists());
      assert.isTrue(noteItem.isVisible());
      assert.strictEqual(noteItem.get(':first-child').text(), note.content.title);
      assert.strictEqual(noteItem.get(':last-child').text(), note.content.body);
    });
  });

  it('Renders a single empty note', async () => {
    const wrapper = shallowMount(NoteMenu);
    assert.isTrue(wrapper.isVisible());

    resetNoteStore();
    await mockTauriApi([]);
    await noteStore.getAllNotes();

    const noteItems = wrapper.findAll('li');
    assert.strictEqual(noteItems.length, 1);

    const firstChild = noteItems[0].get(':first-child');
    const lastChild = noteItems[0].get(':last-child');
    const noteItemClassName = noteItems[0].classes().join(' ');

    assert.isTrue(noteItems[0].isVisible());
    assert.isEmpty(firstChild.text());
    assert.isEmpty(lastChild.text());
    assert.isTrue(noteItemClassName.includes('--selected'));
    assert.isTrue(noteItemClassName.includes('--empty'));
    assert.isTrue(lastChild.classes().join(' ').includes('--empty'));
  });

  it('Creates a new note', async () => {
    const wrapper = shallowMount(NoteMenu);
    assert.isTrue(wrapper.isVisible());

    await mockTauriApi(localNotes);
    await noteStore.getAllNotes();

    assert.isFalse(isEmptyNote(noteStore.state.notes[0]));
    assert.isFalse(isEmptyNote(noteStore.state.selectedNote));

    const newNoteButton = getByTestId(wrapper, 'new');
    newNoteButton.trigger('click');

    assert.isTrue(isEmptyNote(noteStore.state.notes[0]));
    assert.isTrue(isEmptyNote(noteStore.state.selectedNote));
  });

  it('Selects a clicked note', async () => {
    const wrapper = shallowMount(NoteMenu);
    assert.isTrue(wrapper.isVisible());

    await mockTauriApi(localNotes);
    await noteStore.getAllNotes();

    assert.isFalse(isEmptyNote(noteStore.state.notes[0]));
    assert.isFalse(isEmptyNote(noteStore.state.selectedNote));

    const noteToSelect = localNotes[2];
    const noteItem = wrapper.get(`li[data-note-id="${noteToSelect.id}"]`);

    assert.isTrue(noteItem.isVisible());
    assert.notStrictEqual(noteStore.state.selectedNote.id, noteToSelect.id);

    await noteItem.trigger('click');

    assert.strictEqual(noteStore.state.selectedNote.id, noteToSelect.id);
    assert.isTrue(noteItem.classes().join(' ').includes('--selected'));
  });

  it('Selects extra notes with cmd/ctrl', async () => {
    const wrapper = shallowMount(NoteMenu);
    assert.isTrue(wrapper.isVisible());

    await mockTauriApi(localNotes);
    await noteStore.getAllNotes();

    assert.isFalse(isEmptyNote(noteStore.state.notes[0]));
    assert.isFalse(isEmptyNote(noteStore.state.selectedNote));
    assert.isEmpty(noteStore.state.extraSelectedNotes);

    const notesToSelect = [localNotes[2], localNotes[4], localNotes[7]];
    const assertPromises = notesToSelect.map(async (note) => {
      const noteItem = wrapper.get(`li[data-note-id="${note.id}"]`);

      if (!noteItem.isVisible() || noteStore.state.selectedNote.id === note.id) {
        return false;
      }

      await noteItem.trigger('click', { metaKey: true });

      if (
        !noteStore.state.extraSelectedNotes.includes(note) ||
        noteStore.state.selectedNote.id === note.id ||
        !noteItem.classes().join(' ').includes('--selected')
      ) {
        return false;
      }

      return true;
    });

    const assertResults = await Promise.all(assertPromises);
    assert.isTrue(!assertResults.includes(false));
  });

  // it('Selects extra notes with alt', async () => {});

  // it('Navigates notes with up/down arrow keys', async () => {});

  // it('Sets contextmenu ev', async () => {});

  // it('Sets menu width with drag-bar', async () => {});
});
