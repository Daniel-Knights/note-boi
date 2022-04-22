import { mount } from '@vue/test-utils';

import { mockTauriApi } from '../tauri';
import { isEmptyNote } from '../../utils';
import { getByTestId, resetNoteStore, setCrypto } from '../utils';
import * as n from '../../store/note';
import * as s from '../../store/sync';
import localNotes from '../notes.json';

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

    await mockTauriApi(localNotes);
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

    const deleteButton = getByTestId(wrapper, 'delete');

    assert.isTrue(wrapper.vm.comp?.hasOneEmptyNote);
    assert.isTrue(deleteButton.element.className.includes('--disabled'));
  });

  it('Deletes a note', async () => {
    await mockTauriApi(localNotes);
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

  it('Sets theme preference', async () => {
    const { wrapper, assertionError } = await mountContextMenu();
    if (assertionError) assert.fail();

    const themeMenu = getByTestId(wrapper, 'theme');

    const firstThemeEl = themeMenu.get(':first-child');
    const firstTheme = firstThemeEl.element.innerHTML;
    await firstThemeEl.trigger('click');

    assert.strictEqual(wrapper.vm.selectedTheme, firstTheme);
    assert.strictEqual(localStorage.getItem('theme'), firstTheme);

    const secondThemeEl = themeMenu.get(':nth-child(2)');
    const secondTheme = secondThemeEl.element.innerHTML;
    await secondThemeEl.trigger('click');

    assert.strictEqual(wrapper.vm.selectedTheme, secondTheme);
    assert.strictEqual(localStorage.getItem('theme'), secondTheme);
  });

  it('Sets auto-sync preference', async () => {
    const { wrapper, assertionError } = await mountContextMenu();
    if (assertionError) assert.fail();

    const autoSyncMenu = getByTestId(wrapper, 'auto-sync');

    await autoSyncMenu.get(':first-child').trigger('click');

    assert.isTrue(s.state.autoSyncEnabled);
    assert.strictEqual(localStorage.getItem('auto-sync'), 'true');

    await autoSyncMenu.get(':nth-child(2)').trigger('click');

    assert.isFalse(s.state.autoSyncEnabled);
    assert.strictEqual(localStorage.getItem('auto-sync'), 'false');
  });
});
