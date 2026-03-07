import { shallowMount, VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';

import * as n from '../../../store/note';
import { Note, PersistentStorage } from '../../../classes';
import { LONG_PRESS_TIMEOUT, MIN_MENU_WIDTH } from '../../../constant';
import { isEmptyNote } from '../../../utils';
import { mockApi } from '../../mock';
import { getByTestId, getDummyNotes, resetNoteStore } from '../../utils';

import NoteMenu from '../../../components/NoteMenu.vue';

const getDataNoteUuid = (uuid: string) => `li[data-note-uuid="${uuid}"]`;

function mountNoteMenu(props?: { isSmallScreen?: boolean; showNoteMenu?: boolean }) {
  return shallowMount(NoteMenu, {
    props: {
      isSmallScreen: props?.isSmallScreen ?? false,
      showNoteMenu: props?.showNoteMenu ?? true,
    },
  });
}

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
    const wrapper = mountNoteMenu();

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);
  });

  it('Renders a list item for every note', () => {
    const wrapper = mountNoteMenu();

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
    const wrapper = mountNoteMenu();

    setResValues.invoke({ get_all_notes: [[]] });

    await n.getAllNotes();

    const noteItems = wrapper.findAll('li');
    assert.lengthOf(noteItems, 1);

    const noteItemClassName = noteItems[0]!.classes().join(' ');

    assert.isTrue(noteItems[0]!.isVisible());
    assert.isTrue(noteItemClassName.includes('--selected'));
    assert.isTrue(noteItemClassName.includes('--empty'));

    // Empty notes don't render child elements due to v-if conditions
    assert.isEmpty(noteItems[0]!.text());
  });

  it('Filters notes by text input', async () => {
    const wrapper = mountNoteMenu();
    const wrapperVm = wrapper.vm as unknown as { filteredNotes: Note[] };
    const dummyNotesLength = getDummyNotes().length;

    assert.lengthOf(wrapper.findAll('li'), dummyNotesLength);

    const filterInput = getByTestId(wrapper, 'note-filter');
    const inputCases = ['Amet', 'amet', '😬ö'];

    for (const inputText of inputCases) {
      // eslint-disable-next-line no-await-in-loop
      await filterInput.setValue(inputText);
      // eslint-disable-next-line no-await-in-loop
      await nextTick();

      assert.isBelow(wrapperVm.filteredNotes.length, dummyNotesLength);

      wrapperVm.filteredNotes.forEach((note) => {
        assert.include(note.getText().toLowerCase(), inputText.toLowerCase());
      });
    }

    // Case: clear filter text
    await filterInput.setValue('');
    await nextTick();

    assert.strictEqual(wrapperVm.filteredNotes.length, dummyNotesLength);
  });

  it('Creates a new note', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mountNoteMenu();
    const newNoteButton = getByTestId(wrapper, 'new');
    const newNoteSpy = vi.spyOn(n, 'newNote');

    newNoteButton.trigger('click');

    await Promise.all(promises);

    expect(newNoteSpy).toHaveBeenCalledOnce();

    assert.strictEqual(calls.size, 0);
    assert.isTrue(isEmptyNote(n.noteState.notes[0]));
    assert.isTrue(isEmptyNote(n.noteState.selectedNote));
  });

  it('Closes menu on small screen when creating new note', async () => {
    const { promises } = mockApi();
    const wrapper = mountNoteMenu({ isSmallScreen: true });
    const newNoteButton = getByTestId(wrapper, 'new');

    newNoteButton.trigger('click');
    await Promise.all(promises);

    assert.isTrue(wrapper.emitted('update:showNoteMenu')![0]![0] === false);
  });

  it('Selects a clicked note', async () => {
    const wrapper = mountNoteMenu();

    const noteToSelect = getDummyNotes()[2]!;
    const noteItem = wrapper.get(getDataNoteUuid(noteToSelect.uuid));

    assert.isTrue(noteItem.isVisible());
    assert.notStrictEqual(n.noteState.selectedNote.uuid, noteToSelect.uuid);

    await noteItem.trigger('click');

    assert.strictEqual(n.noteState.selectedNote.uuid, noteToSelect.uuid);
    assert.isTrue(noteItem.classes().join(' ').includes('--selected'));
  });

  it('Closes menu on small screen when selecting note', async () => {
    const wrapper = mountNoteMenu({ isSmallScreen: true });
    const noteToSelect = getDummyNotes()[2]!;
    const noteItem = wrapper.get(getDataNoteUuid(noteToSelect.uuid));

    await noteItem.trigger('click');

    assert.isTrue(wrapper.emitted('update:showNoteMenu')![0]![0] === false);
  });

  // ENH: Test selected note visibility on arrow key navigation
  it('Navigates notes with up/down arrow keys', async () => {
    const wrapper = mountNoteMenu();

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
    const wrapper = mountNoteMenu();
    const wrapperVm = wrapper.vm as unknown as {
      contextMenuEv?: MouseEvent | PointerEvent;
    };

    assert.isUndefined(wrapperVm.contextMenuEv);

    const listWrapper = getByTestId(wrapper, 'note-list');
    await listWrapper.trigger('contextmenu');

    assert.isDefined(wrapperVm.contextMenuEv);

    const ev = wrapperVm.contextMenuEv as MouseEvent | PointerEvent;
    assert.isDefined(ev.clientX);
    assert.isDefined(ev.clientY);
  });

  it('Sets contextmenu ev on touch long-press', async () => {
    const wrapper = mountNoteMenu();
    const listWrapper = getByTestId(wrapper, 'note-list');
    const wrapperVm = wrapper.vm as unknown as {
      contextMenuEv?: PointerEvent;
      longPressTimer?: number;
    };

    assert.isUndefined(wrapperVm.contextMenuEv);
    assert.isUndefined(wrapperVm.longPressTimer);

    // Start long press
    vi.useFakeTimers();

    await listWrapper.trigger('pointerdown', { pointerType: 'touch' });
    assert.isDefined(wrapperVm.longPressTimer);

    // Wait for long press timeout
    vi.advanceTimersByTime(LONG_PRESS_TIMEOUT);

    assert.isDefined(wrapperVm.contextMenuEv);

    vi.useRealTimers();
  });

  it('Cancels touch long-press on pointer move', async () => {
    const wrapper = mountNoteMenu();
    const listWrapper = getByTestId(wrapper, 'note-list');
    const wrapperVm = wrapper.vm as unknown as {
      contextMenuEv?: PointerEvent;
      longPressTimer?: number;
    };

    // Start long press
    vi.useFakeTimers();

    await listWrapper.trigger('pointerdown', { pointerType: 'touch' });
    assert.isDefined(wrapperVm.longPressTimer);

    // Move pointer (cancels long press)
    await listWrapper.trigger('pointermove');
    assert.isUndefined(wrapperVm.longPressTimer);

    // Wait to ensure context menu is not set
    vi.advanceTimersByTime(LONG_PRESS_TIMEOUT);

    assert.isUndefined(wrapperVm.contextMenuEv);

    vi.useRealTimers();
  });

  it('Cancels touch long-press on pointer up', async () => {
    const wrapper = mountNoteMenu();
    const listWrapper = getByTestId(wrapper, 'note-list');
    const wrapperVm = wrapper.vm as unknown as {
      contextMenuEv?: PointerEvent;
      longPressTimer?: number;
    };

    // Start long press
    vi.useFakeTimers();

    await listWrapper.trigger('pointerdown', { pointerType: 'touch' });
    assert.isDefined(wrapperVm.longPressTimer);

    // Release pointer (cancels long press)
    await listWrapper.trigger('pointerup');
    assert.isUndefined(wrapperVm.longPressTimer);

    vi.advanceTimersByTime(LONG_PRESS_TIMEOUT);

    assert.isUndefined(wrapperVm.contextMenuEv);

    vi.useRealTimers();
  });

  it('Cleans up long press timer on unmount', async () => {
    const wrapper = mountNoteMenu();
    const listWrapper = getByTestId(wrapper, 'note-list');
    const wrapperVm = wrapper.vm as unknown as {
      longPressTimer?: number;
    };

    await listWrapper.trigger('pointerdown', { pointerType: 'touch' });
    assert.isDefined(wrapperVm.longPressTimer);

    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    wrapper.unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(wrapperVm.longPressTimer);
  });

  it('Sets menu width with drag-bar', async () => {
    const wrapper = mountNoteMenu();
    const wrapperVm = wrapper.vm as unknown as {
      menuWidthDesktop: string;
      isDragging: boolean;
    };
    const initialWidth = wrapperVm.menuWidthDesktop;

    assert.match(initialWidth, /^\d+px$/);
    assert.isFalse(wrapperVm.isDragging);

    // Ensure only clicks on drag bar initialise dragging
    document.dispatchEvent(new MouseEvent('mouseup'));

    assert.isFalse(wrapperVm.isDragging);
    assert.strictEqual(wrapperVm.menuWidthDesktop, initialWidth);

    document.dispatchEvent(new MouseEvent('mousemove'));

    assert.isFalse(wrapperVm.isDragging);
    assert.strictEqual(wrapperVm.menuWidthDesktop, initialWidth);

    // Click drag bar
    const dragBar = getByTestId(wrapper, 'drag-bar');
    await dragBar.trigger('mousedown');

    assert.isTrue(wrapperVm.isDragging);

    document.dispatchEvent(new MouseEvent('mouseup'));

    assert.isFalse(wrapperVm.isDragging);
    assert.isNotNull(PersistentStorage.get('MENU_WIDTH'));

    // Is hidden when dragged below min width
    await dragBar.trigger('mousedown');

    assert.isTrue(wrapperVm.isDragging);

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }));

    assert.strictEqual(wrapperVm.menuWidthDesktop, `${MIN_MENU_WIDTH}px`);
    assert.strictEqual(wrapper.emitted('update:showNoteMenu')![0]![0], false);

    // Is shown when dragged above min width
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 400 }));

    assert.strictEqual(wrapperVm.menuWidthDesktop, '400px');

    await nextTick();

    assert.strictEqual(wrapper.element.style.width, '400px');
    assert.strictEqual(wrapper.emitted('update:showNoteMenu')![1]![0], true);

    document.dispatchEvent(new MouseEvent('mouseup'));

    assert.isFalse(wrapperVm.isDragging);
    assert.strictEqual(PersistentStorage.get('MENU_WIDTH'), '400px');
  });

  it('Uses 100vw width on small screens', () => {
    const wrapper = mountNoteMenu({ isSmallScreen: true });

    assert.strictEqual(wrapper.element.style.width, '100vw');
  });

  describe('Selects/deselects extra notes', () => {
    /** Triggers clicks with cmd/ctrl key. */
    async function testMetaKeySelects(
      wrapper: VueWrapper,
      notesToSelect: Note[],
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
      const wrapper = mountNoteMenu();
      const selectedNoteItem = wrapper.get(
        getDataNoteUuid(n.noteState.selectedNote.uuid)
      );

      await selectedNoteItem.trigger('click', { metaKey: true });

      assert.isEmpty(n.noteState.extraSelectedNotes);
    });

    it('With cmd/ctrl', async () => {
      const wrapper = mountNoteMenu();
      const notesToSelect = [
        getDummyNotes()[2]!,
        getDummyNotes()[4]!,
        getDummyNotes()[7]!,
      ];

      await testMetaKeySelects(wrapper, notesToSelect);
      await testMetaKeyDeselects(wrapper);
    });

    it('With shift', async () => {
      const wrapper = mountNoteMenu();
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
          const wrapper = mountNoteMenu();

          const testSelects = testMetaShiftKeySelects(wrapper);
          testSelects[testSelectsMethodName]();

          await testSelects.run();
          await testMetaKeyDeselects(wrapper);
        });
      }
    );
  });
});
