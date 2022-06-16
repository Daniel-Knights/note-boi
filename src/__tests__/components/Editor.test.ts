import { mount } from '@vue/test-utils';

import * as n from '../../store/note';
import * as s from '../../store/sync';
import { unixToDateTime } from '../../utils';
import localNotes from '../notes.json';
import { mockTauriApi } from '../tauri';
import { copyObjArr, getByTestId } from '../utils';

import Editor from '../../components/Editor.vue';

describe('Editor', () => {
  it('Mounts', () => {
    const wrapper = mount(Editor);
    assert.isTrue(wrapper.isVisible());
  });

  it('Has the correct timestamp', () => {
    const wrapper = mount(Editor);
    const timestamp = getByTestId(wrapper, 'timestamp');

    assert.strictEqual(timestamp.text(), unixToDateTime(new Date().getTime()));
  });

  it('Sets the correct note text', async () => {
    const wrapper = mount(Editor);
    const editorBody = getByTestId(wrapper, 'body');

    assert.isEmpty(editorBody.text());

    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();

    assert.include(editorBody.text(), '¯\\_(ツ)_/¯');

    n.selectNote(localNotes[1].id);

    assert.include(editorBody.text(), localNotes[1].content.body);
  });

  it('Updates on sync if selected note is unedited', async () => {
    const wrapper = mount(Editor);
    const editorBody = getByTestId(wrapper, 'body');

    assert.isEmpty(editorBody.text());

    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();

    assert.include(editorBody.text(), '¯\\_(ツ)_/¯');

    const remoteNotes = copyObjArr(localNotes);
    remoteNotes.forEach((nt) => {
      if (nt.id === n.state.selectedNote.id) {
        nt.content.delta = { ops: [{ insert: 'Remote update' }] };
      }
    });

    mockTauriApi(remoteNotes);
    await n.getAllNotes();
    await s.pull();

    assert.include(editorBody.text(), 'Remote update');
  });
});
