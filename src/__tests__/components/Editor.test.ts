import { mount } from '@vue/test-utils';

import Editor from '../../components/Editor.vue';

describe('Editor', () => {
  it('Mounts', () => {
    const wrapper = mount(Editor);
    expect(wrapper).toBeDefined();
  });
});
