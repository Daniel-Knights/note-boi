import { mockIPC } from '@tauri-apps/api/mocks';

import * as n from '../store/note';
import * as s from '../store/sync';
import { isEmptyNote } from '../utils';

import localNotes from './notes.json';
import { isNote, mockPromise } from './utils';

type Fn = () => void;

/** Mocks calls to the Tauri API. */
export function mockTauriApi(
  notes?: n.Note[],
  options?: {
    mockFns?: { login?: Fn; logout?: Fn };
    httpStatus?: number;
    appVersion?: string;
  }
): void {
  const httpStatus = options?.httpStatus || 200;

  mockIPC((cmd, args) => {
    type ArgsMessage = {
      cmd?: string;
      event?: string;
      options?: {
        url?: string;
        method?: string;
        body?: {
          payload?: {
            notes?: n.Note[];
            username?: string;
            token?: string;
            current_password?: string;
            new_password?: string;
          };
        };
      };
    };

    const reqMessage = args.message as ArgsMessage | undefined;

    switch (cmd) {
      case 'tauri':
        switch (reqMessage?.cmd) {
          case 'httpRequest': {
            if (!s.syncState.isLoading) {
              assert.fail('Loading state not set');
            }

            const reqOptions = reqMessage?.options;
            const reqType = reqOptions?.url?.split('/api/')[1];
            const reqPayload = reqOptions?.body?.payload;

            const resData: { notes?: n.Note[]; token?: string } = {};

            // Ensure no empty notes are pushed to the server
            reqPayload?.notes?.forEach((note) => {
              if (isEmptyNote(note)) assert.fail('Empty note');
            });

            switch (reqType) {
              case 'login':
                resData.notes = localNotes;
                resData.token = 'token';
                break;
              case 'signup':
                resData.token = 'token';
                break;
              case 'notes': {
                // Pull
                if (reqOptions?.method === 'POST') {
                  resData.notes = notes;
                  // Push
                } else if (reqOptions?.method === 'PUT') {
                  const reqNotes = reqPayload?.notes;

                  if (!Array.isArray(reqNotes) || reqNotes.some((nt) => !isNote(nt))) {
                    assert.fail('Invalid notes');
                  }
                }

                break;
              }
              case 'account/password/change':
                if (
                  reqPayload?.username !== 'd' ||
                  reqPayload.token !== 'token' ||
                  reqPayload.current_password !== '1' ||
                  reqPayload.new_password !== '2'
                ) {
                  assert.fail(
                    'Invalid username, token, current_password, or new_password'
                  );
                }

                resData.token = 'token';

                break;
              case 'account/delete':
                if (reqPayload?.username !== 'd' || reqPayload.token !== 'token') {
                  assert.fail('Invalid username or token');
                }
              // no default
            }

            return mockPromise({
              status: httpStatus,
              data: httpStatus > 299 ? 'Error' : JSON.stringify(resData),
            });
          }
          case 'emit':
            switch (reqMessage?.event) {
              case 'login':
                if (options?.mockFns?.login) {
                  options.mockFns.login();
                }
                break;
              case 'logout':
                if (options?.mockFns?.logout) {
                  options.mockFns.logout();
                }
                break;
              // no default
            }
            break;
          case 'getAppVersion':
            return mockPromise(options?.appVersion);
          case 'askDialog':
            return mockPromise(true);
          // no default
        }
        break;
      case 'get_all_notes':
        return mockPromise(notes);
      case 'delete_note':
      case 'new_note':
        return mockPromise();
      case 'edit_note':
        return new Promise<void>((res) => {
          n.noteState.selectedNote = args.note as n.Note;
          res();
        });
      case 'sync_all_local_notes':
        return mockPromise();
      // no default
    }
  });
}

/**
 * Intercepts calls to `event.listen` and returns an object
 * of whether or not each `events` item has been called.
 */
export function testTauriListen(events: string[]): Record<string, boolean> {
  const listenResults: Record<string, boolean> = {};

  events.forEach((event) => {
    listenResults[event] = false;
  });

  mockIPC((cmd, args) => {
    if (cmd !== 'tauri') return;

    const message = args.message as Record<string, string>;
    const typedEvent = message.event as keyof typeof listenResults;

    if (message.cmd === 'listen' && listenResults[typedEvent] !== undefined) {
      listenResults[typedEvent] = true;
    }
  });

  return listenResults;
}
