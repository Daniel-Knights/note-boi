import { enableAutoUnmount, shallowMount, VueWrapper } from '@vue/test-utils';

import * as n from '../../store/note';
import { STORAGE_KEYS } from '../../constant';
import { isEmptyNote } from '../../utils';
import localNotes from '../notes.json';
import { mockTauriApi } from '../tauri';
import { copyObjArr, getByTestId, resetNoteStore, setCrypto } from '../utils';

import NoteMenu from '../../components/NoteMenu.vue';

const getDataNoteId = (id: string) => `li[data-note-id="${id}"]`;

// Hooks
beforeAll(setCrypto);

beforeEach(async () => {
  mockTauriApi(copyObjArr(localNotes));
  await n.getAllNotes();

  assert.isFalse(isEmptyNote(n.state.notes[0]));
  assert.isFalse(isEmptyNote(n.state.selectedNote));
  assert.deepEqual(n.state.notes[0], n.state.selectedNote);
  assert.isEmpty(n.state.extraSelectedNotes);
});

enableAutoUnmount(afterEach);
afterEach(resetNoteStore);

// Tests
describe('NoteMenu', () => {
  it('Mounts', () => {
    const wrapper = shallowMount(NoteMenu);
    assert.isTrue(wrapper.isVisible());
  });

  it('Renders a list item for every note', () => {
    const wrapper = shallowMount(NoteMenu);
    assert.isTrue(wrapper.isVisible());

    assert.strictEqual(wrapper.findAll('li').length, localNotes.length);

    n.state.notes.forEach((note) => {
      const noteItem = wrapper.find(getDataNoteId(note.id));

      assert.isTrue(noteItem.exists());
      assert.isTrue(noteItem.isVisible());
      assert.strictEqual(noteItem.get(':first-child').text(), note.content.title);
      assert.strictEqual(noteItem.get(':last-child').text(), note.content.body);
    });
  });

  it('Renders a single empty note', async () => {
    const wrapper = shallowMount(NoteMenu);
    assert.isTrue(wrapper.isVisible());

    resetNoteStore();
    mockTauriApi([]);
    await n.getAllNotes();

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

  it('Creates a new note', () => {
    const wrapper = shallowMount(NoteMenu);
    assert.isTrue(wrapper.isVisible());

    const newNoteButton = getByTestId(wrapper, 'new');
    newNoteButton.trigger('click');

    assert.isTrue(isEmptyNote(n.state.notes[0]));
    assert.isTrue(isEmptyNote(n.state.selectedNote));
  });

  it('Selects a clicked note', async () => {
    const wrapper = shallowMount(NoteMenu);
    assert.isTrue(wrapper.isVisible());

    const noteToSelect = localNotes[2];
    const noteItem = wrapper.get(getDataNoteId(noteToSelect.id));

    assert.isTrue(noteItem.isVisible());
    assert.notStrictEqual(n.state.selectedNote.id, noteToSelect.id);

    await noteItem.trigger('click');

    assert.strictEqual(n.state.selectedNote.id, noteToSelect.id);
    assert.isTrue(noteItem.classes().join(' ').includes('--selected'));
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

        if (!noteItem.isVisible() || n.state.selectedNote.id === note.id) {
          return false;
        }

        await noteItem.trigger('click', { metaKey: true });

        const isExtraSelectedNote =
          n.state.extraSelectedNotes.map((nt) => nt.id).includes(note.id) &&
          n.state.selectedNote.id !== note.id &&
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
      const currentSelectedNote = n.state.selectedNote;
      const nextSelectedNote = n.state.extraSelectedNotes[0];
      const selectedNoteItem = wrapper.get(getDataNoteId(currentSelectedNote.id));
      await selectedNoteItem.trigger('click', { metaKey: true });

      const isNotExtraSelectedNote =
        n.state.selectedNote.id !== currentSelectedNote.id &&
        !n.state.extraSelectedNotes.includes(currentSelectedNote) &&
        n.state.selectedNote.id === nextSelectedNote.id &&
        !n.state.extraSelectedNotes.includes(nextSelectedNote);

      if (!isNotExtraSelectedNote) return false;

      const assertResultSelect = await testMetaKeySelects(
        wrapper,
        // Spread to prevent mutating array mid-loop
        [...n.state.extraSelectedNotes],
        true
      );

      return assertResultSelect && n.state.extraSelectedNotes.length === 0;
    }

    /**
     * Triggers clicks with cmd/ctrl and alt keys,
     * then returns a boolean indicating the result.
     */
    function testMetaAltKeySelects(wrapper: VueWrapper) {
      const indexesToSelect = [2, 4, 7];
      const lowestIndex = indexesToSelect[0];
      const highestIndex = indexesToSelect[indexesToSelect.length - 1];
      const expectedLength = highestIndex - lowestIndex + 1;

      let notesToSelect = indexesToSelect.map((i) => n.state.notes[i]);
      let noteItemIndex = lowestIndex;
      let expectedNoteOrder = [...notesToSelect];

      let assertResult = true;

      if (!wrapper.isVisible()) assertResult = false;

      function pushNoteOrder(i: number) {
        if (indexesToSelect.includes(i)) return;
        expectedNoteOrder.push(n.state.notes[i]);
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
        const noteItem = wrapper.get(getDataNoteId(n.state.notes[noteItemIndex].id));
        await noteItem.trigger('click', { altKey: true });

        if (n.state.extraSelectedNotes.length !== expectedLength) assertResult = false;

        // Ensure correct order
        const isCorrectOrder = n.state.extraSelectedNotes.every(
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

      const selectedNoteItem = wrapper.get(getDataNoteId(n.state.selectedNote.id));
      await selectedNoteItem.trigger('click', { metaKey: true });

      assert.isEmpty(n.state.extraSelectedNotes);
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

      const noteItem = wrapper.get(getDataNoteId(n.state.notes[6].id));
      await noteItem.trigger('click', { altKey: true });

      assert.strictEqual(n.state.extraSelectedNotes.length, 6);

      n.state.extraSelectedNotes.forEach((note, i) => {
        assert.strictEqual(note.id, n.state.notes[i + 1].id);
      });

      const assertResult = await testMetaKeyDeselects(wrapper);

      assert.isTrue(assertResult);
    });

    describe.each(['setLowerToHigher', 'setHigherToLower'] as const)(
      'With cmd/ctrl and alt',
      (testSelectsMethodName) => {
        it(testSelectsMethodName, async () => {
          const wrapper = shallowMount(NoteMenu);

          const testSelects = testMetaAltKeySelects(wrapper);
          testSelects[testSelectsMethodName]();

          const assertResultSelect = await testSelects.run();
          assert.isTrue(assertResultSelect);

          const assertResultDeselect = await testMetaKeyDeselects(wrapper);
          assert.isTrue(assertResultDeselect);
        });
      }
    );
  });

  it('Navigates notes with up/down arrow keys', async () => {
    const wrapper = shallowMount(NoteMenu);
    assert.isTrue(wrapper.isVisible());

    function keyNav(direction: 'Up' | 'Down') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: `Arrow${direction}` }));
    }

    assert.deepEqual(n.state.selectedNote, n.state.notes[0]);
    keyNav('Down');
    assert.deepEqual(n.state.selectedNote, n.state.notes[1]);
    n.selectNote(n.state.notes[6].id);
    keyNav('Down');
    assert.deepEqual(n.state.selectedNote, n.state.notes[7]);
    keyNav('Up');
    assert.deepEqual(n.state.selectedNote, n.state.notes[6]);
    n.selectNote(n.state.notes[6].id);
    keyNav('Up');
    assert.deepEqual(n.state.selectedNote, n.state.notes[5]);

    document.body.click();

    assert.deepEqual(n.state.selectedNote, n.state.notes[5]);
    keyNav('Up');
    assert.deepEqual(n.state.selectedNote, n.state.notes[5]);
    keyNav('Down');
    assert.deepEqual(n.state.selectedNote, n.state.notes[5]);

    await wrapper.trigger('click');

    assert.deepEqual(n.state.selectedNote, n.state.notes[5]);
    keyNav('Up');
    assert.deepEqual(n.state.selectedNote, n.state.notes[4]);
    keyNav('Down');
    assert.deepEqual(n.state.selectedNote, n.state.notes[5]);
  });

  it('Sets contextmenu ev', async () => {
    const wrapper = shallowMount(NoteMenu);
    const wrapperVm = wrapper.vm as unknown as {
      contextMenuEv: MouseEvent;
    };
    assert.isTrue(wrapper.isVisible());

    assert.isUndefined(wrapperVm.contextMenuEv);

    const listEl = wrapper.get({ ref: 'noteList' });
    await listEl.trigger('contextmenu');

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
});
