import { enableAutoUnmount, mount } from '@vue/test-utils';

import { copyObjArr, getByTestId, setCrypto } from '../utils';
import { unixToDateTime } from '../../utils';
import { mockTauriApi } from '../tauri';
import * as n from '../../store/note';
import localNotes from '../notes.json';

import Editor from '../../components/Editor.vue';

beforeAll(setCrypto);
enableAutoUnmount(afterEach);

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
    const editorBody = wrapper.get({ ref: 'editorBody' });

    assert.isEmpty(editorBody.text());

    await mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();

    assert.include(editorBody.text(), '¯\\_(ツ)_/¯');

    n.selectNote(localNotes[1].id);

    assert.include(editorBody.text(), localNotes[1].content.body);
  });
});
