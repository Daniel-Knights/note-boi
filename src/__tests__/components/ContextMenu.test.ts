import { enableAutoUnmount, mount } from '@vue/test-utils';

import * as n from '../../store/note';
import { isEmptyNote } from '../../utils';
import localNotes from '../notes.json';
import { mockTauriApi } from '../tauri';
import { copyObjArr, getByTestId, resetNoteStore, setCrypto } from '../utils';

import ContextMenu from '../../components/ContextMenu.vue';

async function mountContextMenu(attachTo?: HTMLElement) {
  const ev: MouseEvent = new MouseEvent('contextmenu', {
    clientX: 100,
    clientY: 200,
  });

  if (attachTo) attachTo.dispatchEvent(ev);

  const wrapper = mount(ContextMenu, { attachTo });
  await wrapper.setProps({ ev });

  const element = wrapper.element as HTMLUListElement;

  const assertionError =
    !wrapper.isVisible() ||
    element.style.top !== `${ev.clientY}px` ||
    element.style.left !== `${ev.clientX}px`;

  return { wrapper, assertionError };
}

beforeAll(setCrypto);
afterEach(resetNoteStore);
enableAutoUnmount(afterEach);

describe('ContextMenu', () => {
  it('Mounts without passed ev', () => {
    const wrapper = mount(ContextMenu);
    assert.isFalse(wrapper.isVisible());
  });

  it('Mounts with ev', async () => {
    const { assertionError } = await mountContextMenu();

    if (assertionError) assert.fail();
  });

  it('Creates a new note', async () => {
    const { wrapper, assertionError } = await mountContextMenu();
    if (assertionError) assert.fail();

    await mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();

    assert.isFalse(isEmptyNote(n.state.selectedNote));
    assert.isFalse(isEmptyNote(n.state.notes[0]));

    await getByTestId(wrapper, 'new').trigger('click');

    assert.isTrue(isEmptyNote(n.state.selectedNote));
    assert.isTrue(isEmptyNote(n.state.notes[0]));
  });

  it('Delete button disabled with no notes', async () => {
    await mockTauriApi();
    await n.getAllNotes();

    const div = document.createElement('div');
    div.dataset.noteId = n.state.notes[0].id;

    const { wrapper, assertionError } = await mountContextMenu(div);
    if (assertionError) assert.fail();

    const deleteButton = getByTestId<HTMLButtonElement>(wrapper, 'delete');

    assert.isTrue(deleteButton.element.className.includes('--disabled'));
  });

  it('Deletes a note', async () => {
    await mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();

    const noteToDelete = { ...localNotes[0] };
    const div = document.createElement('div');
    div.dataset.noteId = noteToDelete.id;

    const { wrapper, assertionError } = await mountContextMenu(div);
    if (assertionError) assert.fail();

    n.selectNote(noteToDelete.id);

    const noteToDeleteIndex = n.findNoteIndex(noteToDelete.id);

    assert.deepEqual(n.state.selectedNote, noteToDelete);
    assert.deepEqual(n.state.notes[noteToDeleteIndex], noteToDelete);

    await getByTestId(wrapper, 'delete').trigger('click');

    assert.notDeepEqual(n.state.selectedNote, noteToDelete);
    assert.notDeepEqual(n.state.notes[0], noteToDelete);
    assert.notDeepNestedInclude(n.state.notes, noteToDelete);
  });
});
