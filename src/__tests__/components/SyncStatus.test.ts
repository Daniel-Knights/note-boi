import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { mockIPC } from '@tauri-apps/api/mocks';
import { mount } from '@vue/test-utils';

import SyncStatus from '../../components/SyncStatus.vue';
import { setCrypto } from '../utils';

beforeAll(setCrypto);

beforeEach(() => {
  mockIPC(() => undefined);
});

describe('SyncStatus', () => {
  it('Mounts', () => {
    const wrapper = mount(SyncStatus);

    expect(wrapper).toBeDefined();
  });
});
