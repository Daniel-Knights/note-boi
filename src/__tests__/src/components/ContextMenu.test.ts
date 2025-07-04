import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import * as n from '../../../store/note';
import { isEmptyNote } from '../../../utils';
import { clearMockApiResults, mockApi } from '../../mock';
import { getByTestId, getDummyNotes } from '../../utils';

import ContextMenu from '../../../components/ContextMenu.vue';
import DropMenu from '../../../components/DropMenu.vue';

async function mountContextMenu(attachTo?: HTMLElement) {
  const ev = new MouseEvent('contextmenu', {
    clientX: 100,
    clientY: 200,
  });

  if (attachTo) attachTo.dispatchEvent(ev);

  const wrapper = mount(ContextMenu, { attachTo });
  const wrapperVm = wrapper.vm as unknown as { show: boolean };
  await wrapper.setProps({ ev });

  const element = wrapper.element as HTMLElement;

  if (
    !wrapper.isVisible() ||
    !wrapperVm.show ||
    element.style.top !== `${ev.clientY}px` ||
    element.style.left !== `${ev.clientX}px`
  ) {
    assert.fail();
  }

  return wrapper;
}

describe('ContextMenu', () => {
  it('Mounts without passed ev', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mount(ContextMenu);

    await Promise.all(promises);

    assert.isFalse(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);
  });

  it('Mounts with ev', async () => {
    await mountContextMenu();
  });

  it('Closes', async () => {
    const wrapper = await mountContextMenu();
    const wrapperVm = wrapper.vm as unknown as { show: boolean };

    wrapper.getComponent(DropMenu).vm.$emit('close');
    await nextTick();

    assert.isFalse(wrapper.isVisible());
    assert.isFalse(wrapperVm.show);
  });

  it('Creates a new note', async () => {
    const { calls, promises } = mockApi();

    const wrapper = await mountContextMenu();

    await n.getAllNotes();

    assert.isFalse(isEmptyNote(n.noteState.selectedNote));
    assert.isFalse(isEmptyNote(n.noteState.notes[0]));

    clearMockApiResults({ calls, promises });

    await getByTestId(wrapper, 'new').trigger('click');
    await Promise.all(promises);

    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.invoke.has('new_note'));
    assert.isTrue(isEmptyNote(n.noteState.selectedNote));
    assert.isTrue(isEmptyNote(n.noteState.notes[0]));
  });

  it.each(['Export', 'Delete'])(
    '%s button disabled with no notes',
    async (buttonType) => {
      const { calls, setResValues } = mockApi();

      setResValues.invoke({ get_all_notes: [[]] });

      await n.getAllNotes();

      const div = document.createElement('div');
      div.dataset.noteUuid = n.noteState.notes[0]!.uuid;

      const wrapper = await mountContextMenu(div);
      const button = getByTestId<HTMLButtonElement>(wrapper, buttonType.toLowerCase());

      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.invoke.has('get_all_notes'));
      assert.isTrue(calls.invoke.has('new_note'));
      assert.isTrue(button.element.classList.contains('drop-menu__item--disabled'));
    }
  );

  it('Exports a note', async () => {
    mockApi();

    await n.getAllNotes();

    const noteToExport = { ...getDummyNotes()[0]! };
    const div = document.createElement('div');
    div.dataset.noteUuid = noteToExport.uuid;

    const wrapper = await mountContextMenu(div);

    n.selectNote(noteToExport.uuid);

    const noteToExportIndex = n.findNoteIndex(noteToExport.uuid);

    assert.deepEqual(n.noteState.selectedNote, noteToExport);
    assert.deepEqual(n.noteState.notes[noteToExportIndex], noteToExport);

    const exportNotesSpy = vi.spyOn(n, 'exportNotes');

    await getByTestId(wrapper, 'export').trigger('click');

    expect(exportNotesSpy).toHaveBeenCalledOnce();
    expect(exportNotesSpy).toHaveBeenCalledWith([noteToExport.uuid]);
  });

  it('Exports all selected notes', async () => {
    mockApi();

    await n.getAllNotes();

    const noteToExport = { ...getDummyNotes()[0] };
    const noteSlice = getDummyNotes().slice(2, 6);
    const div = document.createElement('div');
    div.dataset.noteUuid = noteToExport.uuid;

    const wrapper = await mountContextMenu(div);

    n.selectNote(noteToExport.uuid);
    n.noteState.extraSelectedNotes.push(...noteSlice);

    const exportNotesSpy = vi.spyOn(n, 'exportNotes');

    await getByTestId(wrapper, 'export').trigger('click');

    expect(exportNotesSpy).toHaveBeenCalledOnce();
    expect(exportNotesSpy).toHaveBeenCalledWith([
      noteToExport.uuid,
      ...noteSlice.map((nt) => nt.uuid),
    ]);
  });

  it('Deletes a note', async () => {
    mockApi();

    await n.getAllNotes();

    const noteToDelete = { ...getDummyNotes()[0] };
    const div = document.createElement('div');
    div.dataset.noteUuid = noteToDelete.uuid;

    const wrapper = await mountContextMenu(div);

    n.selectNote(noteToDelete.uuid);

    const deleteSpy = vi.spyOn(n, 'deleteNote');

    await getByTestId(wrapper, 'delete').trigger('click');

    expect(deleteSpy).toHaveBeenCalledOnce();
    expect(deleteSpy).toHaveBeenCalledWith(noteToDelete.uuid);
  });

  it('Deletes all selected notes', async () => {
    mockApi();

    await n.getAllNotes();

    const noteToDelete = { ...getDummyNotes()[0] };
    const noteSlice = getDummyNotes().slice(2, 6);
    const div = document.createElement('div');
    div.dataset.noteUuid = noteToDelete.uuid;

    const wrapper = await mountContextMenu(div);

    n.selectNote(noteToDelete.uuid);
    n.noteState.extraSelectedNotes.push(...noteSlice);

    const deleteSelectedSpy = vi.spyOn(n, 'deleteSelectedNotes');

    await getByTestId(wrapper, 'delete').trigger('click');

    expect(deleteSelectedSpy).toHaveBeenCalledOnce();
  });
});
