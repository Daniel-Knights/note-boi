import { shallowMount, VueWrapper } from '@vue/test-utils';

import NoteMenu from '../../components/NoteMenu.vue';
import { getByTestId, resetNoteStore, setCrypto } from '../utils';
import { mockTauriApi } from '../tauri';
import * as n from '../../store/note';
import localNotes from '../notes.json';
import { isEmptyNote } from '../../utils';

const getDataNoteId = (id: string) => `li[data-note-id="${id}"]`;

/** Triggers click with cmd/ctrl key and returns a boolean indicating the result. */
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
      n.state.extraSelectedNotes.includes(note) &&
      n.state.selectedNote.id !== note.id &&
      noteItem.classes().join(' ').includes('--selected');

    return isDeselect ? !isExtraSelectedNote : isExtraSelectedNote;
  });

  const assertResults = await Promise.all(assertPromises);
  return !assertResults.includes(false);
}

beforeAll(setCrypto);

beforeEach(async () => {
  await mockTauriApi(localNotes);
  await n.getAllNotes();

  assert.isFalse(isEmptyNote(n.state.notes[0]));
  assert.isFalse(isEmptyNote(n.state.selectedNote));
  assert.deepEqual(n.state.notes[0], n.state.selectedNote);
  assert.isEmpty(n.state.extraSelectedNotes);
});

afterEach(resetNoteStore);

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
    await mockTauriApi([]);
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

  describe('Selects extra notes', () => {
    it('With cmd/ctrl', async () => {
      const wrapper = shallowMount(NoteMenu);
      assert.isTrue(wrapper.isVisible());

      const notesToSelect = [localNotes[2], localNotes[4], localNotes[7]];
      const assertResult = await testMetaKeySelects(wrapper, notesToSelect);

      assert.isTrue(assertResult);
    });

    describe('With alt', () => {
      const wrapper = shallowMount(NoteMenu);
      assert.isTrue(wrapper.isVisible());

      it('Lower index to higher', async () => {
        const noteItem = wrapper.get(getDataNoteId(n.state.notes[6].id));
        await noteItem.trigger('click', { altKey: true });

        assert.strictEqual(n.state.extraSelectedNotes.length, 6);

        n.state.extraSelectedNotes.forEach((note, i) => {
          assert.strictEqual(note.id, n.state.notes[i + 1].id);
        });
      });

      it('Higher index to lower', async () => {
        n.selectNote(n.state.notes[6].id);

        const noteItem = wrapper.get(getDataNoteId(n.state.notes[0].id));
        await noteItem.trigger('click', { altKey: true });

        assert.strictEqual(n.state.extraSelectedNotes.length, 6);

        n.state.extraSelectedNotes.reverse().forEach((note, i) => {
          assert.strictEqual(note.id, n.state.notes[i].id);
        });
      });
    });

    describe('With cmd/ctrl and alt', () => {
      const indexesToSelect = [2, 4, 7];
      const lowestIndex = indexesToSelect[0];
      const highestIndex = indexesToSelect[indexesToSelect.length - 1];
      const expectedLength = highestIndex - lowestIndex + 1;

      it('Lower index to higher', async () => {
        const wrapper = shallowMount(NoteMenu);
        assert.isTrue(wrapper.isVisible());

        const notesToSelect = indexesToSelect.map((i) => n.state.notes[i]);

        // Select with cmd/ctrl
        const assertResult = await testMetaKeySelects(wrapper, notesToSelect);
        assert.isTrue(assertResult);

        // Select with alt
        const noteItem = wrapper.get(getDataNoteId(n.state.notes[lowestIndex].id));
        await noteItem.trigger('click', { altKey: true });

        assert.strictEqual(n.state.extraSelectedNotes.length, expectedLength);

        // Ensure correct order
        const expectedNoteOrder = [...notesToSelect];

        for (let i = highestIndex; i > lowestIndex; i -= 1) {
          if (!indexesToSelect.includes(i)) {
            expectedNoteOrder.push(n.state.notes[i]);
          }
        }

        assert.deepEqual(n.state.extraSelectedNotes, expectedNoteOrder);
      });

      it('Higher index to lower', async () => {
        const wrapper = shallowMount(NoteMenu);
        assert.isTrue(wrapper.isVisible());

        const notesToSelect = indexesToSelect.map((i) => n.state.notes[i]).reverse();

        // Select with cmd/ctrl
        const assertResult = await testMetaKeySelects(wrapper, notesToSelect);
        assert.isTrue(assertResult);

        // Select with alt
        const noteItem = wrapper.get(getDataNoteId(n.state.notes[highestIndex].id));
        await noteItem.trigger('click', { altKey: true });

        assert.strictEqual(n.state.extraSelectedNotes.length, expectedLength);

        // Ensure correct order
        const expectedNoteOrder = [...notesToSelect];

        for (let i = lowestIndex; i < highestIndex; i += 1) {
          if (!indexesToSelect.includes(i)) {
            expectedNoteOrder.push(n.state.notes[i]);
          }
        }

        assert.deepEqual(n.state.extraSelectedNotes, expectedNoteOrder);
      });
    });
  });

  describe('Deselects extra notes', () => {
    it('Not single selected note', async () => {
      const wrapper = shallowMount(NoteMenu);
      assert.isTrue(wrapper.isVisible());

      const selectedNoteItem = wrapper.get(getDataNoteId(n.state.selectedNote.id));
      await selectedNoteItem.trigger('click', { metaKey: true });

      assert.isEmpty(n.state.extraSelectedNotes);
    });

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

      return (
        isNotExtraSelectedNote &&
        // Spread to prevent mutating array mid-loop
        testMetaKeySelects(wrapper, [...n.state.extraSelectedNotes], true) &&
        n.state.extraSelectedNotes.length === 0
      );
    }

    it('Notes selected with cmd/ctrl', async () => {
      const wrapper = shallowMount(NoteMenu);
      assert.isTrue(wrapper.isVisible());

      const notesToSelect = [localNotes[2], localNotes[4], localNotes[7]];
      const assertResultSelect = await testMetaKeySelects(wrapper, notesToSelect);

      assert.isTrue(assertResultSelect);

      const assertResultDeselect = await testMetaKeyDeselects(wrapper);

      assert.isTrue(assertResultDeselect);
    });

    it('Notes selected with alt', async () => {
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

    describe('Notes selected with cmd/ctrl and alt', () => {
      const indexesToSelect = [2, 4, 7];
      const lowestIndex = indexesToSelect[0];
      const highestIndex = indexesToSelect[indexesToSelect.length - 1];
      const expectedLength = highestIndex - lowestIndex + 1;

      it('Lower index to higher', async () => {
        const wrapper = shallowMount(NoteMenu);
        assert.isTrue(wrapper.isVisible());

        const notesToSelect = indexesToSelect.map((i) => n.state.notes[i]);

        // Select with cmd/ctrl
        const assertResultSelect = await testMetaKeySelects(wrapper, notesToSelect);
        assert.isTrue(assertResultSelect);

        // Select with alt
        const noteItem = wrapper.get(getDataNoteId(n.state.notes[lowestIndex].id));
        await noteItem.trigger('click', { altKey: true });

        assert.strictEqual(n.state.extraSelectedNotes.length, expectedLength);

        // Ensure correct order
        const expectedNoteOrder = [...notesToSelect];

        for (let i = highestIndex; i > lowestIndex; i -= 1) {
          if (!indexesToSelect.includes(i)) {
            expectedNoteOrder.push(n.state.notes[i]);
          }
        }

        assert.deepEqual(n.state.extraSelectedNotes, expectedNoteOrder);

        const assertResultDeselect = await testMetaKeyDeselects(wrapper);

        assert.isTrue(assertResultDeselect);
      });

      it('Higher index to lower', async () => {
        const wrapper = shallowMount(NoteMenu);
        assert.isTrue(wrapper.isVisible());

        const notesToSelect = indexesToSelect.map((i) => n.state.notes[i]).reverse();

        // Select with cmd/ctrl
        const assertResult = await testMetaKeySelects(wrapper, notesToSelect);
        assert.isTrue(assertResult);

        // Select with alt
        const noteItem = wrapper.get(getDataNoteId(n.state.notes[highestIndex].id));
        await noteItem.trigger('click', { altKey: true });

        assert.strictEqual(n.state.extraSelectedNotes.length, expectedLength);

        // Ensure correct order
        const expectedNoteOrder = [...notesToSelect];

        for (let i = lowestIndex; i < highestIndex; i += 1) {
          if (!indexesToSelect.includes(i)) {
            expectedNoteOrder.push(n.state.notes[i]);
          }
        }

        assert.deepEqual(n.state.extraSelectedNotes, expectedNoteOrder);

        const assertResultDeselect = await testMetaKeyDeselects(wrapper);

        assert.isTrue(assertResultDeselect);
      });
    });
  });

  // it('Navigates notes with up/down arrow keys', async () => {});

  // it('Sets contextmenu ev', async () => {});

  // it('Sets menu width with drag-bar', async () => {});
});
