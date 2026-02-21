import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import * as n from '../../../store/note';
import { isEmptyNote } from '../../../utils';
import { clearMockApiResults, mockApi } from '../../mock';
import { findByTestId, getByTestId, getDummyNotes, resolveImmediate } from '../../utils';

import ContextMenu from '../../../components/ContextMenu.vue';
import DropMenu from '../../../components/DropMenu.vue';

const mockHandleNewNote = vi.fn();

describe('ContextMenu', () => {
  it('Mounts without passed ev', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mount(ContextMenu);

    await Promise.all(promises);

    assert.isFalse(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);
  });

  it('Mounts with ev', async () => {
    const ev = getContextMenuEv();
    const wrapper = await mountContextMenu(ev);

    assertMounted(wrapper, ev);
  });

  it('Remains onscreen if opened at bottom of page', async () => {
    const ev = getContextMenuEv({ y: window.innerHeight });
    const wrapper = await mountContextMenu(ev);

    // 10 = a bit of padding
    assertMounted(wrapper, { x: ev.clientX, y: window.innerHeight - 10 });
  });

  it('Remains onscreen if opened at right edge of page', async () => {
    const ev = getContextMenuEv({ x: window.innerWidth });
    const wrapper = await mountContextMenu(ev);

    // 10 = a bit of padding
    assertMounted(wrapper, { x: window.innerWidth - 10, y: ev.clientY });
  });

  it('Closes', async () => {
    const ev = getContextMenuEv();
    const wrapper = await mountContextMenu(ev);

    assertMounted(wrapper, ev);

    const wrapperVm = wrapper.vm as unknown as { show: boolean };

    wrapper.getComponent(DropMenu).vm.$emit('close');
    await nextTick();

    assert.isFalse(wrapper.isVisible());
    assert.isFalse(wrapperVm.show);
  });

  it('Closes on menu item click', async () => {
    const ev = getContextMenuEv();
    const wrapper = await mountContextMenu(ev);

    assertMounted(wrapper, ev);

    const wrapperVm = wrapper.vm as unknown as { show: boolean };

    await getByTestId(wrapper, 'new').trigger('click');
    await nextTick();

    assert.isFalse(wrapper.isVisible());
    assert.isFalse(wrapperVm.show);
  });

  it('Closes on click outside', async () => {
    const ev = getContextMenuEv();
    const wrapper = await mountContextMenu(ev);

    assertMounted(wrapper, ev);

    const wrapperVm = wrapper.vm as unknown as { show: boolean };

    document.body.click();
    await nextTick();

    assert.isFalse(wrapper.isVisible());
    assert.isFalse(wrapperVm.show);
  });

  it('Creates a new note', async () => {
    const { calls, promises } = mockApi();
    const ev = getContextMenuEv();
    const wrapper = await mountContextMenu(ev);

    assertMounted(wrapper, ev);

    await n.getAllNotes();

    assert.isFalse(isEmptyNote(n.noteState.selectedNote));
    assert.isFalse(isEmptyNote(n.noteState.notes[0]));

    clearMockApiResults({ calls, promises });

    await getByTestId(wrapper, 'new').trigger('click');
    await Promise.all(promises);

    expect(mockHandleNewNote).toHaveBeenCalledOnce();

    assert.strictEqual(calls.size, 0); // Would be 1 if we weren't mocking handleNewNote
  });

  it('Does not show export or delete button if no clicked note', async () => {
    const ev = getContextMenuEv();
    const wrapper = await mountContextMenu(ev);

    assertMounted(wrapper, ev);

    const exportNoteItem = findByTestId(wrapper, 'export');
    const deleteNoteItem = findByTestId(wrapper, 'delete');

    assert.isFalse(exportNoteItem.exists());
    assert.isFalse(deleteNoteItem.exists());
  });

  it.each(['Export', 'Delete'])(
    '%s button not shown with no notes',
    async (buttonType) => {
      const { calls, setResValues } = mockApi();

      setResValues.invoke({ get_all_notes: [[]] });

      await n.getAllNotes();

      const div = document.createElement('div');
      div.dataset.noteUuid = n.noteState.notes[0]!.uuid;

      const ev = getContextMenuEv();
      const wrapper = await mountContextMenu(ev, { attachTo: div });

      assertMounted(wrapper, ev);

      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.invoke.has('get_all_notes'));
      assert.isTrue(calls.invoke.has('new_note'));

      const button = findByTestId(wrapper, buttonType.toLowerCase());

      assert.isFalse(button.exists());
    }
  );

  it('Exports a note', async () => {
    mockApi();

    await n.getAllNotes();

    const noteToExport = { ...getDummyNotes()[0]! };
    const div = document.createElement('div');
    div.dataset.noteUuid = noteToExport.uuid;

    const ev = getContextMenuEv();
    const wrapper = await mountContextMenu(ev, { attachTo: div });

    assertMounted(wrapper, ev);

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

    const ev = getContextMenuEv();
    const wrapper = await mountContextMenu(ev, { attachTo: div });

    assertMounted(wrapper, ev);

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

    const ev = getContextMenuEv();
    const wrapper = await mountContextMenu(ev, { attachTo: div });

    assertMounted(wrapper, ev);

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

    const ev = getContextMenuEv();
    const wrapper = await mountContextMenu(ev, { attachTo: div });

    assertMounted(wrapper, ev);

    n.selectNote(noteToDelete.uuid);
    n.noteState.extraSelectedNotes.push(...noteSlice);

    const deleteSelectedSpy = vi.spyOn(n, 'deleteSelectedNotes');

    await getByTestId(wrapper, 'delete').trigger('click');

    expect(deleteSelectedSpy).toHaveBeenCalledOnce();
  });

  it('Exports all notes', async () => {
    const { promises } = mockApi();
    const ev = getContextMenuEv();
    const wrapper = await mountContextMenu(ev);
    const exportNotesSpy = vi.spyOn(n, 'exportNotes');
    const exportWrapper = getByTestId(wrapper, 'export-all');

    await exportWrapper.trigger('click');
    await Promise.all(promises);
    await resolveImmediate(); // Defer execution to exportNotes

    expect(exportNotesSpy).toHaveBeenCalledOnce();
    expect(exportNotesSpy).toHaveBeenCalledWith(n.noteState.notes.map((nt) => nt.uuid));
  });

  it('Imports notes', async () => {
    mockApi();
    const ev = getContextMenuEv();
    const wrapper = await mountContextMenu(ev);
    const importNotesSpy = vi.spyOn(n, 'importNotesFromFileChooser');
    const importWrapper = getByTestId(wrapper, 'import');

    await importWrapper.trigger('click');

    expect(importNotesSpy).toHaveBeenCalledOnce();
    expect(importNotesSpy).toHaveBeenCalledWith();
  });
});

//// Utils

async function mountContextMenu(
  ev: PointerEvent,
  options: {
    attachTo?: HTMLElement;
  } = {}
) {
  options.attachTo?.dispatchEvent(ev);

  const wrapper = mount(ContextMenu, {
    attachTo: options.attachTo,
    props: { handleNewNote: mockHandleNewNote },
  });
  await wrapper.setProps({ ev });

  // First time to wait for component to mount, second time to wait for `nextTick`
  // inside component's `watch` hook
  await nextTick();
  await nextTick();

  return wrapper;
}

/**
 * Asserts that `wrapper` is visible and mounted at the correct position
 */
function assertMounted(
  wrapper: Awaited<ReturnType<typeof mountContextMenu>>,
  pos: { x: number; y: number }
) {
  const wrapperVm = wrapper.vm as unknown as { show: boolean };
  const element = wrapper.element as HTMLElement;

  assert.isTrue(wrapper.isVisible());
  assert.isTrue(wrapperVm.show);
  assert.strictEqual(element.style.top, `${pos.y}px`);
  assert.strictEqual(element.style.left, `${pos.x}px`);
}

function getContextMenuEv(options?: { x?: number; y?: number }) {
  return new PointerEvent('contextmenu', {
    clientX: options?.x ?? 100,
    clientY: options?.y ?? 200,
  });
}
