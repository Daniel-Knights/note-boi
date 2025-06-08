import * as n from '../../../store/note';
import { TauriCommand, TauriCommandPayloads } from '../../../constant';
import { hasKeys } from '../../../utils';
import localNotes from '../../notes.json';
import { copyObjArr, isNote, resolveImmediate } from '../../utils';

export const mockKeyring: Record<string, string> = {};

/** Mocks Tauri `invoke` calls. */
export function mockTauriInvoke(
  cmd: string,
  args: Record<string, unknown>,
  options: { resValue?: InvokeResValue; error?: TauriCommand } = {}
) {
  if (options.error === cmd) {
    throw new Error('Mock Tauri Invoke error');
  }

  let resData: n.Note[] | string | undefined = [];

  switch (cmd) {
    case 'get_all_notes': {
      resData =
        // Allow undefined res values for returning no notes
        !options.resValue || !('get_all_notes' in options.resValue)
          ? copyObjArr(localNotes)
          : options.resValue.get_all_notes!.shift();

      break;
    }
    case 'new_note':
      if (!hasKeys(args, ['note'])) {
        assert.fail('Missing note');
      } else if (!isNote(args.note)) {
        assert.fail('Invalid note');
      }

      break;
    case 'edit_note':
      if (!hasKeys(args, ['note'])) {
        assert.fail('Missing note');
      } else if (!isNote(args.note)) {
        assert.fail('Invalid note');
      }

      break;
    case 'delete_note':
      if (!hasKeys(args, ['id'])) {
        assert.fail('Missing id');
      } else if (typeof args.id !== 'string') {
        assert.fail('Invalid id');
      }

      break;
    case 'sync_local_notes':
      if (!hasKeys(args, ['notes'])) {
        assert.fail('Missing notes');
      } else if (!Array.isArray(args.notes) || args.notes.some((nt) => !isNote(nt))) {
        assert.fail('Invalid notes');
      }

      break;
    case 'export_notes':
      if (!hasKeys(args, ['saveDir', 'notes'])) {
        assert.fail('Missing saveDir or notes');
      } else if (
        typeof args.saveDir !== 'string' ||
        !Array.isArray(args.notes) ||
        args.notes.some((nt) => !isNote(nt))
      ) {
        assert.fail('Invalid saveDir or notes');
      }

      break;
    case 'set_access_token':
      if (!hasKeys(args, ['username', 'accessToken'])) {
        assert.fail('Missing username or accessToken');
      } else if (typeof args.username !== 'string') {
        assert.fail('Invalid username');
      } else if (typeof args.accessToken !== 'string') {
        assert.fail('Invalid accessToken');
      }

      mockKeyring[args.username] = args.accessToken;

      break;
    case 'get_access_token':
      if (!hasKeys(args, ['username'])) {
        assert.fail('Missing username');
      } else if (typeof args.username !== 'string') {
        assert.fail('Invalid username');
      }

      resData = mockKeyring[args.username];

      break;
    case 'delete_access_token':
      if (!hasKeys(args, ['username'])) {
        assert.fail('Missing username');
      } else if (typeof args.username !== 'string') {
        assert.fail('Invalid username');
      }

      delete mockKeyring[args.username];

      break;
  }

  return {
    name: cmd,
    calledWith: args,
    promise: resolveImmediate(resData),
  };
}

//// Types

export type InvokeResValue = {
  [C in keyof TauriCommandPayloads]?: TauriCommandPayloads[C]['response'][];
};
