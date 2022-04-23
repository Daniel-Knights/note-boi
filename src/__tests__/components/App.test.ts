import { mount } from '@vue/test-utils';

import { setCrypto } from '../utils';
import { mockTauriApi } from '../tauri';
import * as n from '../../store/note';

import App from '../../App.vue';

beforeAll(setCrypto);

describe('App', () => {
  it('Mounts', async () => {
    await mockTauriApi();

    const getAllNotesSpy = vi.spyOn(n, 'getAllNotes');
    const wrapper = mount(App);
    assert.isTrue(wrapper.isVisible());

    expect(getAllNotesSpy).toHaveBeenCalled();
  });
});
