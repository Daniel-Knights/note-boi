import { mount } from '@vue/test-utils';

import NoteMenu from '../../components/NoteMenu.vue';

describe('NoteMenu', () => {
  it('Mounts', () => {
    const wrapper = mount(NoteMenu);

    expect(wrapper).toBeDefined();
  });
});
