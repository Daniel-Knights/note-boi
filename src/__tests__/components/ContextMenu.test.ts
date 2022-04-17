import { describe, it, assert, beforeAll, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

import ContextMenu from '../../components/ContextMenu.vue';
import { mockTauriApi } from '../tauri';
import { isEmptyNote } from '../../utils';
import { getByTestId, resetNoteStore, setCrypto } from '../utils';
import * as noteStore from '../../store/note';
import localNotes from '../notes.json';

async function mountContextMenu(attachTo?: HTMLElement) {
  const ev: MouseEvent = new MouseEvent('contextmenu', {
    clientX: 100,
    clientY: 200,
  });

  if (attachTo) attachTo.dispatchEvent(ev);

  const wrapper = mount(ContextMenu, { attachTo });
  await wrapper.setProps({ ev });

  return { wrapper, ev };
}

beforeAll(setCrypto);
beforeEach(resetNoteStore);

describe('ContextMenu', () => {
  it('Mounts without passed ev', () => {
    const wrapper = mount(ContextMenu);

    assert.isDefined(wrapper);
    assert.isFalse(wrapper.isVisible());
  });

  it('Mounts with ev', async () => {
    const { wrapper, ev } = await mountContextMenu();
    const element = wrapper.element as HTMLUListElement;

    assert.isDefined(wrapper);
    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(element.style.top, `${ev.clientY}px`);
    assert.strictEqual(element.style.left, `${ev.clientX}px`);
  });

  it('Creates a new note', async () => {
    const { wrapper, ev } = await mountContextMenu();
    const element = wrapper.element as HTMLUListElement;

    assert.isDefined(wrapper);
    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(element.style.top, `${ev.clientY}px`);
    assert.strictEqual(element.style.left, `${ev.clientX}px`);

    await mockTauriApi(localNotes);
    await noteStore.getAllNotes();
    assert.isFalse(isEmptyNote(noteStore.state.selectedNote));
    assert.isFalse(isEmptyNote(noteStore.state.notes[0]));

    await getByTestId(wrapper, 'new').trigger('click');

    assert.isTrue(isEmptyNote(noteStore.state.selectedNote));
    assert.isTrue(isEmptyNote(noteStore.state.notes[0]));
  });

  it('Deletes a note', async () => {
    await mockTauriApi(localNotes);
    await noteStore.getAllNotes();

    const noteToDelete = { ...localNotes[0] };
    const div = document.createElement('div');
    div.dataset.noteId = noteToDelete.id;
    const { wrapper, ev } = await mountContextMenu(div);
    const element = wrapper.element as HTMLUListElement;

    assert.isDefined(wrapper);
    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(element.style.top, `${ev.clientY}px`);
    assert.strictEqual(element.style.left, `${ev.clientX}px`);

    await noteStore.selectNote(noteToDelete.id);
    const noteToDeleteIndex = noteStore.findNoteIndex(noteToDelete.id);
    assert.deepEqual(noteStore.state.selectedNote, noteToDelete);
    assert.deepEqual(noteStore.state.notes[noteToDeleteIndex], noteToDelete);

    await getByTestId(wrapper, 'delete').trigger('click');

    assert.notDeepEqual(noteStore.state.selectedNote, noteToDelete);
    assert.notDeepEqual(noteStore.state.notes[0], noteToDelete);
    assert.notDeepNestedInclude(noteStore.state.notes, noteToDelete);
  });

  it.todo('Sets theme preference', async () => {
    const { wrapper, ev } = await mountContextMenu();
    const element = wrapper.element as HTMLUListElement;

    assert.isDefined(wrapper);
    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(element.style.top, `${ev.clientY}px`);
    assert.strictEqual(element.style.left, `${ev.clientX}px`);
  });

  it.todo('Sets auto-sync preference', async () => {
    const { wrapper, ev } = await mountContextMenu();
    const element = wrapper.element as HTMLUListElement;

    assert.isDefined(wrapper);
    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(element.style.top, `${ev.clientY}px`);
    assert.strictEqual(element.style.left, `${ev.clientX}px`);
  });
});
