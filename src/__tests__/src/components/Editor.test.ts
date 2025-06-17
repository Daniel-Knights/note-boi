import { mount } from '@vue/test-utils';

import * as n from '../../../store/note';
import { unixToDateTime } from '../../../utils';
import { mockApi } from '../../mock';
import { getByTestId, getDummyNotes } from '../../utils';

import Editor from '../../../components/Editor.vue';

describe('Editor', () => {
  it('Mounts', async () => {
    const { calls, promises } = mockApi();

    const wrapper = mount(Editor);

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);
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

    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.invoke.has('get_all_notes'));
    assert.include(editorBody.text(), '¯\\_(ツ)_/¯');

    n.selectNote(getDummyNotes()[1]!.id);

    assert.include(editorBody.text(), getDummyNotes()[1]!.content.body);
  });
});
