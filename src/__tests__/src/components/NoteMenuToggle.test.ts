import { mount } from '@vue/test-utils';

import NoteMenuToggle from '../../../components/NoteMenuToggle.vue';

describe('NoteMenuToggle', () => {
  it('Exposes label and expanded state', async () => {
    const wrapper = mount(NoteMenuToggle, { props: { expanded: false } });

    assert.strictEqual(wrapper.attributes('aria-label'), 'Toggle note menu');
    assert.strictEqual(wrapper.attributes('aria-controls'), 'note-menu');
    assert.strictEqual(wrapper.attributes('aria-expanded'), 'false');

    await wrapper.setProps({ expanded: true });

    assert.strictEqual(wrapper.attributes('aria-expanded'), 'true');
  });
});
