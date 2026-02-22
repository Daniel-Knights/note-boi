import { mount } from '@vue/test-utils';
import Quill, { Delta } from 'quill';
import { nextTick } from 'vue';

import * as n from '../../../store/note';
import { Note } from '../../../classes';
import { unixToDateTime } from '../../../utils';
import { clearMockApiResults, mockApi } from '../../mock';
import { getByTestId, getDummyNotes, waitUntil } from '../../utils';

import Editor from '../../../components/Editor.vue';
import FindInPage from '../../../components/FindInPage.vue';

describe('Editor', () => {
  it('Mounts', async () => {
    const { calls, promises } = mockApi();

    const wrapper = mount(Editor, { props: { isTouchDevice: false } });

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);
  });

  it('Has the correct timestamp', () => {
    const wrapper = mount(Editor, { props: { isTouchDevice: false } });
    const timestamp = getByTestId(wrapper, 'timestamp');

    assert.strictEqual(timestamp.text(), unixToDateTime(new Date().getTime()));
  });

  it('Sets the correct note text', async () => {
    const { calls } = mockApi();
    const wrapper = mount(Editor, { props: { isTouchDevice: false } });
    const editorBody = getByTestId(wrapper, 'body');

    assert.isEmpty(editorBody.text());

    await n.getAllNotes();

    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.invoke.has('get_all_notes'));
    assert.include(editorBody.text(), '¯\\_(ツ)_/¯');

    n.selectNote(getDummyNotes()[1]!.uuid);

    assert.include(editorBody.text(), getDummyNotes()[1]!.content.body);
  });

  it('Constructs note object from parsed text', async () => {
    const { calls } = mockApi();
    const wrapper = mount(Editor, { props: { isTouchDevice: false } });
    const wrapperVm = wrapper.vm as unknown as {
      quillEditor: Quill;
      ignoreTextChange: boolean;
    };

    const noteText = `
        
         foo  


     

         bar 
      baz
      
      `;

    n.newNote();

    // `text-change` event handler doesn't run for some reason,
    // so we have to reset this manually
    wrapperVm.ignoreTextChange = false;

    clearMockApiResults({ calls });

    wrapperVm.quillEditor.setText(noteText);

    await waitUntil(() => calls.invoke.has('edit_note'));

    const noteContent = (calls.invoke[0]?.calledWith!.note as Note).content;

    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.invoke.has('edit_note'));
    assert.deepEqual(noteContent, {
      title: 'foo',
      body: 'bar',
      // Quill defaults to new line on empty content and this gets composed
      // into the new note content, so an extra line break is expected here
      delta: new Delta([{ insert: `${noteText}\n` }]),
    });
  });

  it('Opens find-in-page', async () => {
    const wrapper = mount(Editor, { props: { isTouchDevice: false } });

    window.dispatchEvent(new KeyboardEvent('keydown', { metaKey: true, key: 'f' }));

    await nextTick();

    assert.isTrue(wrapper.getComponent(FindInPage).isVisible());
  });

  it('Does not show find-in-page on touch devices', async () => {
    const wrapper = mount(Editor, { props: { isTouchDevice: true } });

    window.dispatchEvent(new KeyboardEvent('keydown', { metaKey: true, key: 'f' }));

    await nextTick();

    assert.isFalse(wrapper.findComponent(FindInPage).exists());
  });

  it('Closes find-in-page', async () => {
    const wrapper = mount(Editor, { props: { isTouchDevice: false } });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    await nextTick();

    assert.isFalse(wrapper.findComponent(FindInPage).exists());
  });

  it('Clears undo history when switching notes', async () => {
    mockApi();
    const dummyNotes = getDummyNotes();
    const wrapper = mount(Editor, { props: { isTouchDevice: false } });
    const wrapperVm = wrapper.vm as unknown as {
      quillEditor: Quill;
      ignoreTextChange: boolean;
    };

    await n.getAllNotes();

    // Select first note and add some text
    n.selectNote(dummyNotes[0]!.uuid);
    await nextTick();

    // Select second note
    n.selectNote(dummyNotes[9]!.uuid);
    await nextTick();

    // Try to undo - should not restore previous note's content
    wrapperVm.quillEditor.history.undo();
    await nextTick();

    // Verify content is from the second note, not the first
    const currentText = wrapperVm.quillEditor.getText();
    assert.notStrictEqual(currentText, dummyNotes[0]!.getText());
    assert.strictEqual(currentText, dummyNotes[9]!.getText());
  });
});
