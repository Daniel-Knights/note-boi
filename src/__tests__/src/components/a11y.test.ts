import { mount } from '@vue/test-utils';

import Loading from '../../../components/Loading.vue';
import NoteMenuToggle from '../../../components/NoteMenuToggle.vue';

describe('Accessibility', () => {
  it('Loading is announced as a status', () => {
    const wrapper = mount(Loading);

    assert.strictEqual(wrapper.attributes('role'), 'status');
    assert.strictEqual(wrapper.attributes('aria-label'), 'Loading');
  });

  it('NoteMenuToggle exposes label and expanded state', async () => {
    const wrapper = mount(NoteMenuToggle, { props: { expanded: false } });

    assert.strictEqual(wrapper.attributes('aria-label'), 'Toggle note menu');
    assert.strictEqual(wrapper.attributes('aria-controls'), 'note-menu');
    assert.strictEqual(wrapper.attributes('aria-expanded'), 'false');

    await wrapper.setProps({ expanded: true });

    assert.strictEqual(wrapper.attributes('aria-expanded'), 'true');
  });
});
