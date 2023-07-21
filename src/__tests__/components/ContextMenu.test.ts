import { mount } from '@vue/test-utils';
import { DefineComponent } from 'vue';

import * as n from '../../store/note';
import { isEmptyNote } from '../../utils';
import localNotes from '../notes.json';
import { mockTauriApi } from '../tauri';
import { copyObjArr, getByTestId } from '../utils';

import ContextMenu from '../../components/ContextMenu.vue';
import DropMenu from '../../components/DropMenu.vue';

async function mountContextMenu(attachTo?: HTMLElement) {
  const ev = new MouseEvent('contextmenu', {
    clientX: 100,
    clientY: 200,
  });

  if (attachTo) attachTo.dispatchEvent(ev);

  const wrapper = mount(ContextMenu as DefineComponent, { attachTo });
  await wrapper.setProps({ ev });

  const element = wrapper.element as HTMLElement;

  const assertionError =
    !wrapper.isVisible() ||
    !wrapper.vm.show ||
    element.style.top !== `${ev.clientY}px` ||
    element.style.left !== `${ev.clientX}px`;

  return { wrapper, assertionError };
}

describe('ContextMenu', () => {
  it('Mounts without passed ev', () => {
    const wrapper = mount(ContextMenu as DefineComponent);
    assert.isFalse(wrapper.isVisible());
  });

  it('Mounts with ev', async () => {
    const { assertionError } = await mountContextMenu();

    if (assertionError) assert.fail();
  });

  it('Closes', async () => {
    const { wrapper, assertionError } = await mountContextMenu();
    if (assertionError) assert.fail();

    await wrapper.getComponent(DropMenu).vm.$emit('close');

    assert.isFalse(wrapper.isVisible());
    assert.isFalse(wrapper.vm.show);
  });

  it('Creates a new note', async () => {
    const { wrapper, assertionError } = await mountContextMenu();
    if (assertionError) assert.fail();

    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();

    assert.isFalse(isEmptyNote(n.noteState.selectedNote));
    assert.isFalse(isEmptyNote(n.noteState.notes[0]));

    await getByTestId(wrapper, 'new').trigger('click');

    assert.isTrue(isEmptyNote(n.noteState.selectedNote));
    assert.isTrue(isEmptyNote(n.noteState.notes[0]));
  });

  it('Exports a note', async () => {
    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();

    const noteToExport = { ...localNotes[0] };
    const div = document.createElement('div');
    div.dataset.noteId = noteToExport.id;

    const { wrapper, assertionError } = await mountContextMenu(div);
    if (assertionError) assert.fail();

    n.selectNote(noteToExport.id);

    const noteToExportIndex = n.findNoteIndex(noteToExport.id);

    assert.deepEqual(n.noteState.selectedNote, noteToExport);
    assert.deepEqual(n.noteState.notes[noteToExportIndex], noteToExport);

    const exportNotesSpy = vi.spyOn(n, 'exportNotes');

    await getByTestId(wrapper, 'export').trigger('click');

    expect(exportNotesSpy).toHaveBeenCalledOnce();
    expect(exportNotesSpy).toHaveBeenCalledWith([noteToExport.id]);
    assert.deepEqual(n.noteState.selectedNote, noteToExport);
    assert.deepEqual(n.noteState.notes[noteToExportIndex], noteToExport);
    assert.deepNestedInclude(n.noteState.notes, noteToExport);
  });

  it.each(['Export', 'Delete'])(
    '%s button disabled with no notes',
    async (buttonType) => {
      mockTauriApi();
      await n.getAllNotes();

      const div = document.createElement('div');
      div.dataset.noteId = n.noteState.notes[0].id;

      const { wrapper, assertionError } = await mountContextMenu(div);
      if (assertionError) assert.fail();

      const button = getByTestId<HTMLButtonElement>(wrapper, buttonType.toLowerCase());

      assert.isTrue(button.element.classList.contains('drop-menu__item--disabled'));
    }
  );

  it('Deletes a note', async () => {
    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();

    const noteToDelete = { ...localNotes[0] };
    const div = document.createElement('div');
    div.dataset.noteId = noteToDelete.id;

    const { wrapper, assertionError } = await mountContextMenu(div);
    if (assertionError) assert.fail();

    n.selectNote(noteToDelete.id);

    const noteToDeleteIndex = n.findNoteIndex(noteToDelete.id);

    assert.deepEqual(n.noteState.selectedNote, noteToDelete);
    assert.deepEqual(n.noteState.notes[noteToDeleteIndex], noteToDelete);

    await getByTestId(wrapper, 'delete').trigger('click');

    assert.notDeepEqual(n.noteState.selectedNote, noteToDelete);
    assert.notDeepEqual(n.noteState.notes[noteToDeleteIndex], noteToDelete);
    assert.notDeepNestedInclude(n.noteState.notes, noteToDelete);
  });
});
