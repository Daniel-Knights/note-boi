import { mockIPC } from '@tauri-apps/api/mocks';

import * as n from '../store/note';
import { isEmptyNote } from '../utils';

import localNotes from './notes.json';
import { isNote, mockPromise } from './utils';

type Fn = () => void;

/** Mocks calls to the Tauri API. */
export function mockTauriApi(
  notes?: n.Note[],
  options?: {
    mockFns?: { login: Fn; logout: Fn };
    httpStatus?: number;
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
          payload?: { notes?: n.Note[] };
        };
      };
    };

    const reqMessage = args.message as ArgsMessage | undefined;

    switch (cmd) {
      case 'tauri':
        switch (reqMessage?.cmd) {
          case 'httpRequest':
            return new Promise<Record<string, unknown>>((res) => {
              const reqOptions = reqMessage?.options;
              const reqType = reqOptions?.url?.split('/api/')[1];
              const reqNotes = reqOptions?.body?.payload?.notes;

              const resData: { notes?: n.Note[]; token?: string } = {};

              // Ensure no empty notes are pushed to the server
              reqNotes?.forEach((note) => {
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
                    if (!Array.isArray(reqNotes) || reqNotes.some((nt) => !isNote(nt))) {
                      assert.fail('Invalid notes');
                    }
                  }
                }
                // no default
              }

              res({
                status: httpStatus,
                data: httpStatus > 299 ? 'Error' : JSON.stringify(resData),
              });
            });
          case 'emit':
            switch (reqMessage?.event) {
              case 'login':
                options?.mockFns?.login();
                break;
              case 'logout':
                options?.mockFns?.logout();
                break;
              // no default
            }
            break;
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
          n.state.selectedNote = args.note as n.Note;
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
