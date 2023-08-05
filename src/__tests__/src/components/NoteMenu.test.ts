import { shallowMount, VueWrapper } from '@vue/test-utils';

import * as n from '../../../store/note';
import { STORAGE_KEYS } from '../../../constant';
import { isEmptyNote } from '../../../utils';
import { mockApi } from '../../api';
import localNotes from '../../notes.json';
import { getByTestId, resetNoteStore } from '../../utils';

import NoteMenu from '../../../components/NoteMenu.vue';

const getDataNoteId = (id: string) => `li[data-note-id="${id}"]`;

// Hooks
beforeEach(async () => {
  const { promises } = mockApi();

  await n.getAllNotes();
  await Promise.all(promises);

  assert.isFalse(isEmptyNote(n.noteState.notes[0]));
  assert.isFalse(isEmptyNote(n.noteState.selectedNote));
  assert.deepEqual(n.noteState.notes[0], n.noteState.selectedNote);
  assert.isEmpty(n.noteState.extraSelectedNotes);
});

// Tests
describe('NoteMenu', () => {
  it('Mounts', async () => {
    const { calls, events, promises } = mockApi();
    const wrapper = shallowMount(NoteMenu);

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.length, 0);
    assert.strictEqual(events.emits.length, 0);
    assert.strictEqual(events.listeners.length, 0);
  });

  it('Renders a list item for every note', () => {
    const wrapper = shallowMount(NoteMenu);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(wrapper.findAll('li').length, localNotes.length);

    n.noteState.notes.forEach((note) => {
      const noteItem = wrapper.find(getDataNoteId(note.id));

      assert.isTrue(noteItem.exists());
      assert.isTrue(noteItem.isVisible());
      assert.strictEqual(noteItem.get(':first-child').text(), note.content.title);
      assert.strictEqual(noteItem.get(':last-child').text(), note.content.body);
    });
  });

  it('Renders a single empty note', async () => {
    const { promises } = mockApi({
      invoke: {
        resValue: [],
      },
    });
    const wrapper = shallowMount(NoteMenu);

    assert.isTrue(wrapper.isVisible());

    resetNoteStore();

    await n.getAllNotes();
    await Promise.all(promises);

    const noteItems = wrapper.findAll('li');
    assert.strictEqual(noteItems.length, 1);

    const firstChild = noteItems[0].get(':first-child');
    const lastChild = noteItems[0].get(':last-child');
    const noteItemClassName = noteItems[0].classes().join(' ');

    assert.isTrue(noteItems[0].isVisible());
    assert.isEmpty(firstChild.text());
    assert.isEmpty(lastChild.text());
    assert.isTrue(noteItemClassName.includes('--selected'));
    assert.isTrue(noteItemClassName.includes('--empty'));
    assert.isTrue(lastChild.classes().join(' ').includes('--empty'));
  });

  it('Creates a new note', async () => {
    const { calls, promises } = mockApi();
    const wrapper = shallowMount(NoteMenu);

    assert.isTrue(wrapper.isVisible());

    const newNoteButton = getByTestId(wrapper, 'new');
    newNoteButton.trigger('click');

    await Promise.all(promises);

    assert.isTrue(isEmptyNote(n.noteState.notes[0]));
    assert.isTrue(isEmptyNote(n.noteState.selectedNote));
    assert.strictEqual(calls.length, 1);
    assert.isTrue(calls.has('new_note'));
  });

  it('Selects a clicked note', async () => {
    const wrapper = shallowMount(NoteMenu);

    assert.isTrue(wrapper.isVisible());

    const noteToSelect = localNotes[2];
    const noteItem = wrapper.get(getDataNoteId(noteToSelect.id));

    assert.isTrue(noteItem.isVisible());
    assert.notStrictEqual(n.noteState.selectedNote.id, noteToSelect.id);

    await noteItem.trigger('click');

    assert.strictEqual(n.noteState.selectedNote.id, noteToSelect.id);
    assert.isTrue(noteItem.classes().join(' ').includes('--selected'));
  });

  it('Navigates notes with up/down arrow keys', async () => {
    const wrapper = shallowMount(NoteMenu);

    assert.isTrue(wrapper.isVisible());

    function keyNav(direction: 'Up' | 'Down') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: `Arrow${direction}` }));
    }

    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[0]);
    keyNav('Down');
    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[1]);
    n.selectNote(n.noteState.notes[6].id);
    keyNav('Down');
    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[7]);
    keyNav('Up');
    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[6]);
    n.selectNote(n.noteState.notes[6].id);
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
      contextMenuEv: MouseEvent;
    };

    assert.isTrue(wrapper.isVisible());
    assert.isUndefined(wrapperVm.contextMenuEv);

    const listWrapper = getByTestId(wrapper, 'note-list');
    await listWrapper.trigger('contextmenu');

    assert.isTrue(wrapperVm.contextMenuEv instanceof MouseEvent);
  });

  it('Sets menu width with drag-bar', async () => {
    const wrapper = shallowMount(NoteMenu);
    const wrapperVm = wrapper.vm as unknown as {
      menuWidth: string;
      isDragging: boolean;
    };

    assert.isTrue(wrapper.isVisible());

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
    assert.isNotNull(localStorage.getItem(STORAGE_KEYS.MENU_WIDTH));

    await dragBar.trigger('mousedown');

    assert.isTrue(wrapperVm.isDragging);

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }));

    assert.strictEqual(initialWidth, wrapperVm.menuWidth);

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 400 }));

    assert.strictEqual(wrapperVm.menuWidth, '400px');

    document.dispatchEvent(new MouseEvent('mouseup'));

    assert.isFalse(wrapperVm.isDragging);
    assert.strictEqual(localStorage.getItem(STORAGE_KEYS.MENU_WIDTH), '400px');
  });

  describe('Selects/deselects extra notes', () => {
    /**
     * Triggers clicks with cmd/ctrl key and
     * returns a boolean indicating the result.
     */
    async function testMetaKeySelects(
      wrapper: VueWrapper,
      notesToSelect: n.Note[],
      isDeselect?: boolean
    ) {
      const assertPromises = notesToSelect.map(async (note) => {
        const noteItem = wrapper.get(getDataNoteId(note.id));

        if (!noteItem.isVisible() || n.noteState.selectedNote.id === note.id) {
          return false;
        }

        await noteItem.trigger('click', { metaKey: true });

        const isExtraSelectedNote =
          n.noteState.extraSelectedNotes.map((nt) => nt.id).includes(note.id) &&
          n.noteState.selectedNote.id !== note.id &&
          noteItem.classes().join(' ').includes('--selected');

        return isDeselect ? !isExtraSelectedNote : isExtraSelectedNote;
      });

      const assertResults = await Promise.all(assertPromises);
      return !assertResults.includes(false);
    }

    /**
     * Triggers clicks of already selected items with cmd/ctrl
     * key and returns a boolean indicating the result.
     */
    async function testMetaKeyDeselects(wrapper: VueWrapper) {
      const currentSelectedNote = n.noteState.selectedNote;
      const nextSelectedNote = n.noteState.extraSelectedNotes[0];
      const selectedNoteItem = wrapper.get(getDataNoteId(currentSelectedNote.id));
      await selectedNoteItem.trigger('click', { metaKey: true });

      const isNotExtraSelectedNote =
        n.noteState.selectedNote.id !== currentSelectedNote.id &&
        !n.noteState.extraSelectedNotes.includes(currentSelectedNote) &&
        n.noteState.selectedNote.id === nextSelectedNote.id &&
        !n.noteState.extraSelectedNotes.includes(nextSelectedNote);

      if (!isNotExtraSelectedNote) return false;

      const assertResultSelect = await testMetaKeySelects(
        wrapper,
        // Spread to prevent mutating array mid-loop
        [...n.noteState.extraSelectedNotes],
        true
      );

      return assertResultSelect && n.noteState.extraSelectedNotes.length === 0;
    }

    /**
     * Triggers clicks with cmd/ctrl and alt keys,
     * then returns a boolean indicating the result.
     */
    function testAltKeySelects(wrapper: VueWrapper) {
      const indexesToSelect = [2, 4, 7];
      const lowestIndex = indexesToSelect[0];
      const highestIndex = indexesToSelect[indexesToSelect.length - 1];
      const expectedLength = highestIndex - lowestIndex + 1;

      let notesToSelect = indexesToSelect.map((i) => n.noteState.notes[i]);
      let noteItemIndex = lowestIndex;
      let expectedNoteOrder = [...notesToSelect];

      let assertResult = true;

      if (!wrapper.isVisible()) assertResult = false;

      function pushNoteOrder(i: number) {
        if (indexesToSelect.includes(i)) return;
        expectedNoteOrder.push(n.noteState.notes[i]);
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
        const assertResultSelect = await testMetaKeySelects(wrapper, notesToSelect);
        if (!assertResultSelect) assertResult = false;

        // Select with alt
        const noteItem = wrapper.get(getDataNoteId(n.noteState.notes[noteItemIndex].id));
        await noteItem.trigger('click', { altKey: true });

        if (n.noteState.extraSelectedNotes.length !== expectedLength) {
          assertResult = false;
        }

        // Ensure correct order
        const isCorrectOrder = n.noteState.extraSelectedNotes.every(
          (note, i) => note.id === expectedNoteOrder[i].id
        );

        if (!isCorrectOrder) assertResult = false;

        return assertResult;
      }

      return { setLowerToHigher, setHigherToLower, run };
    }

    // Tests //

    it('Not single selected note', async () => {
      const wrapper = shallowMount(NoteMenu);

      assert.isTrue(wrapper.isVisible());

      const selectedNoteItem = wrapper.get(getDataNoteId(n.noteState.selectedNote.id));
      await selectedNoteItem.trigger('click', { metaKey: true });

      assert.isEmpty(n.noteState.extraSelectedNotes);
    });

    it('With cmd/ctrl', async () => {
      const wrapper = shallowMount(NoteMenu);
      assert.isTrue(wrapper.isVisible());

      const notesToSelect = [localNotes[2], localNotes[4], localNotes[7]];
      const assertResultSelect = await testMetaKeySelects(wrapper, notesToSelect);

      assert.isTrue(assertResultSelect);

      const assertResultDeselect = await testMetaKeyDeselects(wrapper);

      assert.isTrue(assertResultDeselect);
    });

    it('With alt', async () => {
      const wrapper = shallowMount(NoteMenu);
      assert.isTrue(wrapper.isVisible());

      const noteItem = wrapper.get(getDataNoteId(n.noteState.notes[6].id));
      await noteItem.trigger('click', { altKey: true });

      assert.strictEqual(n.noteState.extraSelectedNotes.length, 6);

      n.noteState.extraSelectedNotes.forEach((note, i) => {
        assert.strictEqual(note.id, n.noteState.notes[i + 1].id);
      });

      const assertResult = await testMetaKeyDeselects(wrapper);

      assert.isTrue(assertResult);
    });

    describe.each(['setLowerToHigher', 'setHigherToLower'] as const)(
      'With cmd/ctrl and alt',
      (testSelectsMethodName) => {
        it(testSelectsMethodName, async () => {
          const wrapper = shallowMount(NoteMenu);

          const testSelects = testAltKeySelects(wrapper);
          testSelects[testSelectsMethodName]();

          const assertResultSelect = await testSelects.run();
          assert.isTrue(assertResultSelect);

          const assertResultDeselect = await testMetaKeyDeselects(wrapper);
          assert.isTrue(assertResultDeselect);
        });
      }
    );
  });
});
