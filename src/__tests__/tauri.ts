import { mockIPC } from '@tauri-apps/api/mocks';

import * as noteStore from '../store/note';
import { mockPromise } from './utils';
import localNotes from './notes.json';

type Fn = () => void;

/** Mocks calls to the Tauri API */
export function mockTauriApi(
  notes?: noteStore.Note[] | undefined,
  mockFns?: { login: Fn; logout: Fn },
  httpStatus = 200
): Promise<void> | void {
  mockIPC((cmd, args) => {
    const reqMessage = args.message as
      | {
          cmd?: string;
          event?: string;
          options?: { url?: string; method?: string };
        }
      | undefined;

    switch (cmd) {
      case 'tauri':
        switch (reqMessage?.cmd) {
          case 'httpRequest':
            return new Promise<Record<string, unknown>>((res) => {
              const reqOptions = reqMessage?.options;
              const reqType = reqOptions?.url?.split('/api/')[1];

              const resData: { notes?: noteStore.Note[]; token?: string } = {};

              switch (reqType) {
                case 'login':
                  resData.notes = localNotes;
                  resData.token = 'token';
                  break;
                case 'signup':
                  resData.token = 'token';
                  break;
                case 'notes': {
                  if (reqOptions?.method === 'POST') {
                    resData.notes = localNotes;
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
                mockFns?.login();
                break;
              case 'logout':
                mockFns?.logout();
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
          noteStore.state.selectedNote = args.note as noteStore.Note;
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
