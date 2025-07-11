import { shallowMount, VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';

import * as n from '../../../store/note';
import { Storage } from '../../../classes';
import { isEmptyNote } from '../../../utils';
import { mockApi } from '../../mock';
import { getByTestId, getDummyNotes, resetNoteStore } from '../../utils';

import NoteMenu from '../../../components/NoteMenu.vue';

const getDataNoteUuid = (uuid: string) => `li[data-note-uuid="${uuid}"]`;

// Hooks
beforeEach(async () => {
  mockApi();

  await n.getAllNotes();

  assert.isFalse(isEmptyNote(n.noteState.notes[0]));
  assert.isFalse(isEmptyNote(n.noteState.selectedNote));
  assert.deepEqual(n.noteState.notes[0], n.noteState.selectedNote);
  assert.isEmpty(n.noteState.extraSelectedNotes);
});

// Tests
describe('NoteMenu', () => {
  it('Mounts', async () => {
    const { calls, promises } = mockApi();
    const wrapper = shallowMount(NoteMenu);

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);
  });

  it('Renders a list item for every note', () => {
    const wrapper = shallowMount(NoteMenu);

    assert.lengthOf(wrapper.findAll('li'), getDummyNotes().length);

    n.noteState.notes.forEach((note) => {
      const noteItem = wrapper.find(getDataNoteUuid(note.uuid));

      assert.isTrue(noteItem.exists());
      assert.isTrue(noteItem.isVisible());
      assert.strictEqual(noteItem.get(':first-child').text(), note.content.title);
      assert.strictEqual(noteItem.get(':last-child').text(), note.content.body);
    });
  });

  it('Renders a single empty note', async () => {
    resetNoteStore();
    const { setResValues } = mockApi();
    const wrapper = shallowMount(NoteMenu);

    setResValues.invoke({ get_all_notes: [[]] });

    await n.getAllNotes();

    const noteItems = wrapper.findAll('li');
    assert.lengthOf(noteItems, 1);

    const firstChild = noteItems[0]!.get(':first-child');
    const lastChild = noteItems[0]!.get(':last-child');
    const noteItemClassName = noteItems[0]!.classes().join(' ');

    assert.isTrue(noteItems[0]!.isVisible());
    assert.isEmpty(firstChild.text());
    assert.isEmpty(lastChild.text());
    assert.isTrue(noteItemClassName.includes('--selected'));
    assert.isTrue(noteItemClassName.includes('--empty'));
    assert.isTrue(lastChild.classes().join(' ').includes('--empty'));
  });

  it('Creates a new note', async () => {
    const { calls, promises } = mockApi();
    const wrapper = shallowMount(NoteMenu);
    const newNoteButton = getByTestId(wrapper, 'new');

    newNoteButton.trigger('click');

    await Promise.all(promises);

    assert.isTrue(isEmptyNote(n.noteState.notes[0]));
    assert.isTrue(isEmptyNote(n.noteState.selectedNote));
    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.invoke.has('new_note'));
  });

  it('Selects a clicked note', async () => {
    const wrapper = shallowMount(NoteMenu);

    const noteToSelect = getDummyNotes()[2]!;
    const noteItem = wrapper.get(getDataNoteUuid(noteToSelect.uuid));

    assert.isTrue(noteItem.isVisible());
    assert.notStrictEqual(n.noteState.selectedNote.uuid, noteToSelect.uuid);

    await noteItem.trigger('click');

    assert.strictEqual(n.noteState.selectedNote.uuid, noteToSelect.uuid);
    assert.isTrue(noteItem.classes().join(' ').includes('--selected'));
  });

  // ENH: Test selected note visibility on arrow key navigation
  it('Navigates notes with up/down arrow keys', async () => {
    const wrapper = shallowMount(NoteMenu);

    function keyNav(direction: 'Up' | 'Down') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: `Arrow${direction}` }));
    }

    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[0]);
    keyNav('Down');
    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[1]);
    n.selectNote(n.noteState.notes[6]!.uuid);
    keyNav('Down');
    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[7]);
    keyNav('Up');
    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[6]);
    n.selectNote(n.noteState.notes[6]!.uuid);
    keyNav('Up');
    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[5]);

    document.body.click();

    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[5]);
    keyNav('Up');
    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[5]);
    keyNav('Down');
    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[5]);

    await wrapper.trigger('click');

    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[5]);
    keyNav('Up');
    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[4]);
    keyNav('Down');
    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[5]);
  });

  it('Sets contextmenu ev', async () => {
    const wrapper = shallowMount(NoteMenu);
    const wrapperVm = wrapper.vm as unknown as {
      contextMenuEv?: MouseEvent;
    };

    assert.isUndefined(wrapperVm.contextMenuEv);

    const listWrapper = getByTestId(wrapper, 'note-list');
    await listWrapper.trigger('contextmenu');

    assert.isTrue(wrapperVm.contextMenuEv! instanceof MouseEvent);
  });

  it('Sets menu width with drag-bar', async () => {
    const wrapper = shallowMount(NoteMenu);
    const wrapperVm = wrapper.vm as unknown as {
      menuWidth: string;
      isDragging: boolean;
      isHidden: boolean;
    };
    const initialWidth = wrapperVm.menuWidth;

    assert.match(initialWidth, /^\d+px$/);
    assert.isFalse(wrapperVm.isDragging);

    document.dispatchEvent(new MouseEvent('mouseup'));

    assert.isFalse(wrapperVm.isDragging);
    assert.strictEqual(initialWidth, wrapperVm.menuWidth);

    document.dispatchEvent(new MouseEvent('mousemove'));

    assert.isFalse(wrapperVm.isDragging);
    assert.strictEqual(initialWidth, wrapperVm.menuWidth);

    const dragBar = getByTestId(wrapper, 'drag-bar');
    await dragBar.trigger('mousedown');

    assert.isTrue(wrapperVm.isDragging);

    document.dispatchEvent(new MouseEvent('mouseup'));

    assert.isFalse(wrapperVm.isDragging);
    assert.isNotNull(Storage.get('MENU_WIDTH'));

    await dragBar.trigger('mousedown');

    assert.isTrue(wrapperVm.isDragging);

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }));

    assert.strictEqual(initialWidth, wrapperVm.menuWidth);
    assert.isTrue(wrapperVm.isHidden);

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 400 }));

    assert.strictEqual(wrapperVm.menuWidth, '400px');

    await nextTick();

    assert.strictEqual(wrapper.element.style.width, '400px');
    assert.isFalse(wrapperVm.isHidden);

    document.dispatchEvent(new MouseEvent('mouseup'));

    assert.isFalse(wrapperVm.isDragging);
    assert.strictEqual(Storage.get('MENU_WIDTH'), '400px');
  });

  it('Toggles menu visibility', async () => {
    const wrapper = shallowMount(NoteMenu);
    const wrapperVm = wrapper.vm as unknown as {
      menuWidth: string;
      isHidden: boolean;
    };
    const initialWidth = wrapperVm.menuWidth;

    assert.isFalse(wrapperVm.isHidden);

    const toggleButton = getByTestId(wrapper, 'toggle');

    await toggleButton.trigger('click');

    assert.isTrue(wrapperVm.isHidden);
    assert.strictEqual(wrapperVm.menuWidth, initialWidth);
    assert.strictEqual(wrapper.element.style.marginLeft, `-${wrapperVm.menuWidth}`);

    await toggleButton.trigger('click');

    assert.isFalse(wrapperVm.isHidden);
    assert.strictEqual(wrapperVm.menuWidth, initialWidth);
    assert.strictEqual(wrapper.element.style.marginLeft, '');
  });

  describe('Selects/deselects extra notes', () => {
    /** Triggers clicks with cmd/ctrl key. */
    async function testMetaKeySelects(
      wrapper: VueWrapper,
      notesToSelect: n.Note[],
      isDeselect?: boolean
    ) {
      const assertPromises = notesToSelect.map(async (note) => {
        const noteItem = wrapper.get(getDataNoteUuid(note.uuid));

        if (!noteItem.isVisible() || n.noteState.selectedNote.uuid === note.uuid) {
          assert.fail();
        }

        await noteItem.trigger('click', { metaKey: true });

        const isExtraSelectedNote =
          n.noteState.extraSelectedNotes.map((nt) => nt.uuid).includes(note.uuid) &&
          n.noteState.selectedNote.uuid !== note.uuid &&
          noteItem.classes().join(' ').includes('--selected');

        if (isDeselect && isExtraSelectedNote) {
          assert.fail();
        } else if (!isDeselect && !isExtraSelectedNote) {
          assert.fail();
        }
      });

      await Promise.all(assertPromises);
    }

    /** Triggers clicks of already selected items with cmd/ctrl key. */
    async function testMetaKeyDeselects(wrapper: VueWrapper) {
      const currentSelectedNote = n.noteState.selectedNote;
      const nextSelectedNote = n.noteState.extraSelectedNotes[0]!;
      const selectedNoteItem = wrapper.get(getDataNoteUuid(currentSelectedNote.uuid));
      await selectedNoteItem.trigger('click', { metaKey: true });

      const isNotExtraSelectedNote =
        n.noteState.selectedNote.uuid !== currentSelectedNote.uuid &&
        !n.noteState.extraSelectedNotes.includes(currentSelectedNote) &&
        n.noteState.selectedNote.uuid === nextSelectedNote.uuid &&
        !n.noteState.extraSelectedNotes.includes(nextSelectedNote);

      if (!isNotExtraSelectedNote) return false;

      await testMetaKeySelects(
        wrapper,
        // Spread to prevent mutating array mid-loop
        [...n.noteState.extraSelectedNotes],
        true
      );

      if (n.noteState.extraSelectedNotes.length !== 0) {
        assert.fail();
      }
    }

    /** Triggers clicks with cmd/ctrl and shift keys. */
    function testMetaShiftKeySelects(wrapper: VueWrapper) {
      const indexesToSelect = [2, 4, 7];
      const lowestIndex = indexesToSelect[0]!;
      const highestIndex = indexesToSelect[indexesToSelect.length - 1]!;
      const expectedLength = highestIndex - lowestIndex + 1;

      let notesToSelect = indexesToSelect.map((i) => n.noteState.notes[i]!);
      let noteItemIndex = lowestIndex;
      let expectedNoteOrder = [...notesToSelect];

      if (!wrapper.isVisible()) assert.fail();

      function pushNoteOrder(i: number) {
        if (indexesToSelect.includes(i)) return;
        expectedNoteOrder.push(n.noteState.notes[i]!);
      }

      /** Sets data for checking from lowest index to highest. */
      function setLowerToHigher() {
        for (let i = highestIndex; i > lowestIndex; i -= 1) {
          pushNoteOrder(i);
        }
      }

      /** Sets data for checking from highest index to lowest. */
      function setHigherToLower() {
        notesToSelect = notesToSelect.reverse();
        noteItemIndex = highestIndex;
        expectedNoteOrder = [...notesToSelect];

        for (let i = lowestIndex; i < highestIndex; i += 1) {
          pushNoteOrder(i);
        }
      }

      /** Runs the test. */
      async function run() {
        // Select with cmd/ctrl
        await testMetaKeySelects(wrapper, notesToSelect);

        // Select with shift
        const noteItem = wrapper.get(
          getDataNoteUuid(n.noteState.notes[noteItemIndex]!.uuid)
        );
        await noteItem.trigger('click', { shiftKey: true });

        if (n.noteState.extraSelectedNotes.length !== expectedLength) {
          assert.fail();
        }

        // Ensure correct order
        const isCorrectOrder = n.noteState.extraSelectedNotes.every(
          (note, i) => note.uuid === expectedNoteOrder[i]!.uuid
        );

        if (!isCorrectOrder) assert.fail();
      }

      return { setLowerToHigher, setHigherToLower, run };
    }

    // Tests //

    it('Not single selected note', async () => {
      const wrapper = shallowMount(NoteMenu);
      const selectedNoteItem = wrapper.get(
        getDataNoteUuid(n.noteState.selectedNote.uuid)
      );

      await selectedNoteItem.trigger('click', { metaKey: true });

      assert.isEmpty(n.noteState.extraSelectedNotes);
    });

    it('With cmd/ctrl', async () => {
      const wrapper = shallowMount(NoteMenu);
      const notesToSelect = [
        getDummyNotes()[2]!,
        getDummyNotes()[4]!,
        getDummyNotes()[7]!,
      ];

      await testMetaKeySelects(wrapper, notesToSelect);
      await testMetaKeyDeselects(wrapper);
    });

    it('With shift', async () => {
      const wrapper = shallowMount(NoteMenu);
      const noteItem = wrapper.get(getDataNoteUuid(n.noteState.notes[6]!.uuid));

      await noteItem.trigger('click', { shiftKey: true });

      assert.lengthOf(n.noteState.extraSelectedNotes, 6);

      n.noteState.extraSelectedNotes.forEach((note, i) => {
        assert.strictEqual(note.uuid, n.noteState.notes[i + 1]!.uuid);
      });

      await testMetaKeyDeselects(wrapper);
    });

    describe.each(['setLowerToHigher', 'setHigherToLower'] as const)(
      'With cmd/ctrl and shift',
      (testSelectsMethodName) => {
        it(testSelectsMethodName, async () => {
          const wrapper = shallowMount(NoteMenu);

          const testSelects = testMetaShiftKeySelects(wrapper);
          testSelects[testSelectsMethodName]();

          await testSelects.run();
          await testMetaKeyDeselects(wrapper);
        });
      }
    );
  });
});
