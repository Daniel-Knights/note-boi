import { mount } from '@vue/test-utils';

import Editor from '../../components/Editor.vue';
import { unixToDateTime } from '../../utils';
import { mockTauriApi } from '../tauri';
import { getByTestId, setCrypto } from '../utils';
import * as n from '../../store/note';
import localNotes from '../notes.json';

beforeAll(setCrypto);

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

    await mockTauriApi(localNotes);
    await n.getAllNotes();

    assert.include(editorBody.text(), '¯\\_(ツ)_/¯');

    n.selectNote(localNotes[1].id);

    assert.include(editorBody.text(), localNotes[1].content.body);
  });

  it('Edits a note on text-change', () => {
    const editSpy = vi.spyOn(n, 'editNote');

    mount(Editor);
    expect(editSpy).not.toHaveBeenCalled();

    document.dispatchEvent(new Event(n.noteEvents.change));

    expect(editSpy).toHaveBeenCalled();
  });
});
