import { mount } from '@vue/test-utils';

import * as n from '../../../store/note';
import { isEmptyNote } from '../../../utils';
import { clearMockApiResults, mockApi } from '../../api';
import localNotes from '../../notes.json';
import { getByTestId } from '../../utils';

import ContextMenu from '../../../components/ContextMenu.vue';
import DropMenu from '../../../components/DropMenu.vue';

async function mountContextMenu(attachTo?: HTMLElement) {
  const ev = new MouseEvent('contextmenu', {
    clientX: 100,
    clientY: 200,
  });

  if (attachTo) attachTo.dispatchEvent(ev);

  const wrapper = mount(ContextMenu, { attachTo });
  await wrapper.setProps({ ev });

  const element = wrapper.element as HTMLElement;

  if (
    !wrapper.isVisible() ||
    !wrapper.vm.show ||
    element.style.top !== `${ev.clientY}px` ||
    element.style.left !== `${ev.clientX}px`
  ) {
    assert.fail();
  }

  return wrapper;
}

describe('ContextMenu', () => {
  it('Mounts without passed ev', async () => {
    const { calls, events, promises } = mockApi();

    const wrapper = mount(ContextMenu);

    await Promise.all(promises);

    assert.isFalse(wrapper.isVisible());
    assert.strictEqual(calls.length, 0);
    assert.strictEqual(events.emits.length, 0);
    assert.strictEqual(events.listeners.length, 0);
  });

  it('Mounts with ev', async () => {
    await mountContextMenu();
  });

  it('Closes', async () => {
    const wrapper = await mountContextMenu();
    await wrapper.getComponent(DropMenu).vm.$emit('close');

    assert.isFalse(wrapper.isVisible());
    assert.isFalse(wrapper.vm.show);
  });

  it('Creates a new note', async () => {
    const { calls, promises } = mockApi();

    const wrapper = await mountContextMenu();

    await n.getAllNotes();
    await Promise.all(promises);

    assert.isFalse(isEmptyNote(n.noteState.selectedNote));
    assert.isFalse(isEmptyNote(n.noteState.notes[0]));

    clearMockApiResults({ calls, promises });

    await getByTestId(wrapper, 'new').trigger('click');
    await Promise.all(promises);

    assert.strictEqual(calls.length, 1);
    assert.isTrue(calls.has('new_note'));
    assert.isTrue(isEmptyNote(n.noteState.selectedNote));
    assert.isTrue(isEmptyNote(n.noteState.notes[0]));
  });

  it('Exports a note', async () => {
    const { calls, promises } = mockApi();

    await n.getAllNotes();
    await Promise.all(promises);

    const noteToExport = { ...localNotes[0] };
    const div = document.createElement('div');
    div.dataset.noteId = noteToExport.id;

    const wrapper = await mountContextMenu(div);

    n.selectNote(noteToExport.id);

    const noteToExportIndex = n.findNoteIndex(noteToExport.id);

    await Promise.all(promises);

    assert.deepEqual(n.noteState.selectedNote, noteToExport);
    assert.deepEqual(n.noteState.notes[noteToExportIndex], noteToExport);

    clearMockApiResults({ calls, promises });

    const exportNotesSpy = vi.spyOn(n, 'exportNotes');

    await getByTestId(wrapper, 'export').trigger('click');
    await Promise.all(promises);

    expect(exportNotesSpy).toHaveBeenCalledOnce();
    expect(exportNotesSpy).toHaveBeenCalledWith([noteToExport.id]);
    assert.strictEqual(calls.length, 2);
    assert.isTrue(calls.has('openDialog'));
    assert.isTrue(calls.has('export_notes'));
    assert.deepEqual(n.noteState.selectedNote, noteToExport);
    assert.deepEqual(n.noteState.notes[noteToExportIndex], noteToExport);
    assert.deepNestedInclude(n.noteState.notes, noteToExport);
  });

  it.each(['Export', 'Delete'])(
    '%s button disabled with no notes',
    async (buttonType) => {
      const { calls, promises } = mockApi({
        invoke: {
          resValue: [],
        },
      });

      await n.getAllNotes();
      await Promise.all(promises);

      const div = document.createElement('div');
      div.dataset.noteId = n.noteState.notes[0].id;

      const wrapper = await mountContextMenu(div);
      const button = getByTestId<HTMLButtonElement>(wrapper, buttonType.toLowerCase());

      assert.strictEqual(calls.length, 2);
      assert.isTrue(calls.has('get_all_notes'));
      assert.isTrue(calls.has('new_note'));
      assert.isTrue(button.element.classList.contains('drop-menu__item--disabled'));
    }
  );

  it('Deletes a note', async () => {
    const { calls, promises } = mockApi();

    await n.getAllNotes();
    await Promise.all(promises);

    const noteToDelete = { ...localNotes[0] };
    const div = document.createElement('div');
    div.dataset.noteId = noteToDelete.id;

    const wrapper = await mountContextMenu(div);

    n.selectNote(noteToDelete.id);

    const noteToDeleteIndex = n.findNoteIndex(noteToDelete.id);

    assert.deepEqual(n.noteState.selectedNote, noteToDelete);
    assert.deepEqual(n.noteState.notes[noteToDeleteIndex], noteToDelete);

    clearMockApiResults({ calls, promises });

    await getByTestId(wrapper, 'delete').trigger('click');
    await Promise.all(promises);

    assert.strictEqual(calls.length, 1);
    assert.isTrue(calls.has('delete_note'));
    assert.notDeepEqual(n.noteState.selectedNote, noteToDelete);
    assert.notDeepEqual(n.noteState.notes[noteToDeleteIndex], noteToDelete);
    assert.notDeepNestedInclude(n.noteState.notes, noteToDelete);
  });
});