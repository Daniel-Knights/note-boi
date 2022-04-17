import { describe, it, assert, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';

import ContextMenu from '../../components/ContextMenu.vue';
import { mockTauriApi } from '../tauri';
import { isEmptyNote } from '../../utils';
import { setCrypto } from '../utils';
import * as noteStore from '../../store/note';
import localNotes from '../notes.json';

async function mountContextMenu() {
  const ev: MouseEvent = new MouseEvent('contextmenu', {
    clientX: 100,
    clientY: 200,
  });

  const wrapper = mount(ContextMenu);
  await wrapper.setProps({ ev: ev || undefined });

  return { wrapper, ev };
}

beforeAll(setCrypto);

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

    await wrapper.get('li:first-of-type').trigger('click');

    assert.isTrue(isEmptyNote(noteStore.state.selectedNote));
    assert.isTrue(isEmptyNote(noteStore.state.notes[0]));
  });

  it.todo('Deletes a note', async () => {
    const { wrapper, ev } = await mountContextMenu();
    const element = wrapper.element as HTMLUListElement;

    assert.isDefined(wrapper);
    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(element.style.top, `${ev.clientY}px`);
    assert.strictEqual(element.style.left, `${ev.clientX}px`);
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
