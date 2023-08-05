import { mount } from '@vue/test-utils';

import * as n from '../../../store/note';
import { unixToDateTime } from '../../../utils';
import { mockApi } from '../../api';
import localNotes from '../../notes.json';
import { getByTestId } from '../../utils';

import Editor from '../../../components/Editor.vue';

describe('Editor', () => {
  it('Mounts', async () => {
    const { calls, events, promises } = mockApi();

    const wrapper = mount(Editor);

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.length, 0);
    assert.strictEqual(events.emits.length, 0);
    assert.strictEqual(events.listeners.length, 0);
  });

  it('Has the correct timestamp', () => {
    const wrapper = mount(Editor);
    const timestamp = getByTestId(wrapper, 'timestamp');

    assert.strictEqual(timestamp.text(), unixToDateTime(new Date().getTime()));
  });

  it('Sets the correct note text', async () => {
    const { calls } = mockApi();
    const wrapper = mount(Editor);
    const editorBody = getByTestId(wrapper, 'body');

    assert.isEmpty(editorBody.text());

    await n.getAllNotes();

    assert.strictEqual(calls.length, 1);
    assert.isTrue(calls.has('get_all_notes'));
    assert.include(editorBody.text(), '¯\\_(ツ)_/¯');

    n.selectNote(localNotes[1].id);

    assert.include(editorBody.text(), localNotes[1].content.body);
  });
});
