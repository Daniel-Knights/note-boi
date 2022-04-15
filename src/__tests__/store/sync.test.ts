import { assert, beforeAll, describe, it } from 'vitest';
import { mockIPC } from '@tauri-apps/api/mocks';
import { Client } from '@tauri-apps/api/http';

import * as syncStore from '../../store/sync';
import { setCrypto } from '../utils';
import localNotes from '../notes.json';
import * as noteStore from '../../store/note';

function mockInvokes() {
  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'tauri':
        switch ((args.message as { cmd: string }).cmd) {
          case 'createClient':
            return new Client(0);
          case 'httpRequest':
            return new Promise<Record<string, unknown>>((res) => {
              const reqType = (
                args.message as { options: { url: string } }
              )?.options?.url.split('/api/')[1];

              const resData: { notes?: noteStore.Note[]; token?: string } = {};

              switch (reqType) {
                case 'login':
                  resData.notes = localNotes;
                  resData.token = 'token';
                  break;
                // no default
              }

              res({ ok: true, data: resData });
            });
          // no default
        }
        break;
      case 'get_all_notes':
        return new Promise<void>((res) => {
          res();
        });
      case 'sync_all_local_notes':
        return new Promise<void>((res) => {
          res();
        });
      // no default
    }
  });
}

beforeAll(setCrypto);

describe('Sync', () => {
  it('Sets auto-sync preference', () => {
    syncStore.setAutoSync(true);

    assert.isTrue(syncStore.state.autoSyncEnabled);
    assert.strictEqual(localStorage.getItem('auto-sync'), 'true');

    syncStore.setAutoSync(false);

    assert.isFalse(syncStore.state.autoSyncEnabled);
    assert.strictEqual(localStorage.getItem('auto-sync'), 'false');
  });

  it('Logs a user in', async () => {
    syncStore.state.username = 'd';
    syncStore.state.password = '1';

    mockInvokes();

    await syncStore.login();

    assert.isFalse(syncStore.state.isLoading);
    // assert.deepEqual(noteStore.state.notes, localNotes);
    // assert.strictEqual(syncStore.state.token, 'token');
    assert.strictEqual(syncStore.state.username, 'd');
    // assert.isEmpty(syncStore.state.password);
    // assert.strictEqual(localStorage.getItem('username'), 'd');
    // assert.strictEqual(localStorage.getItem('token'), 'token');
    // assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.None);
    // assert.isEmpty(syncStore.state.error.message);
  });
});
