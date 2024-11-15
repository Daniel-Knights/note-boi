import { Note } from '../../store/note';
import {
  hasKeys,
  isDev,
  isEmptyNote,
  isWhitespaceOnly,
  localStorageParse,
  tauriEmit,
  tauriInvoke,
  tauriListen,
  unixToDateTime,
} from '../../utils';
import { clearMockApiResults, mockApi } from '../api';

describe('Utils', () => {
  it('isDev', () => {
    assert.strictEqual(process.env.NODE_ENV, 'test');
    assert.isFalse(isDev());
  });

  it('unixToDateTime', () => {
    const formattedDateTime = unixToDateTime(1650003060221);

    // 6 is for GitHub workflow, 7 is for local testing
    assert.isTrue(/Apr 15, 2022, (6|7):11 AM/.test(formattedDateTime));
  });

  it('localStorageParse', () => {
    const storedItem = localStorageParse('null');

    assert.isNull(storedItem);

    localStorage.setItem(
      'key',
      JSON.stringify({
        value: 'value',
        set: new Set(),
        array: [1, 2, 3],
        nested: {
          value: 'value',
          set: new Set(),
          array: [1, 2, 3],
        },
      })
    );

    const storedItem2 = localStorageParse('key');

    assert.deepEqual(storedItem2, {
      value: 'value',
      set: {},
      array: [1, 2, 3],
      nested: {
        value: 'value',
        set: {},
        array: [1, 2, 3],
      },
    });
  });

  it('isWhitespaceOnly', () => {
    assert.isTrue(isWhitespaceOnly(''));
    assert.isTrue(isWhitespaceOnly(' '));
    assert.isTrue(isWhitespaceOnly('\n'));
    assert.isFalse(isWhitespaceOnly('Not whitespace'));
  });

  it('isEmptyNote', () => {
    const note = new Note();

    assert.isTrue(isEmptyNote());
    assert.isTrue(isEmptyNote(note));
    note.timestamp = 1650003060221;
    assert.isTrue(isEmptyNote(note));
    note.content.delta = {};
    assert.isTrue(isEmptyNote(note));
    note.content.body = 'Body';
    assert.isFalse(isEmptyNote(note));
    note.content.body = '';
    note.content.title = 'Title';
    assert.isFalse(isEmptyNote(note));
    note.content.body = 'Body';
    assert.isFalse(isEmptyNote(note));
  });

  it('hasKeys', () => {
    const obj: Record<string, number> = { a: 1 };
    const keys = ['a', 'b'];

    assert.isFalse(hasKeys(obj, keys));

    obj.b = 2;

    assert.isTrue(hasKeys(obj, keys));

    obj.c = 3;

    assert.isTrue(hasKeys(obj, keys));
  });

  describe('Tauri API wrappers', () => {
    it('tauriEmit', async () => {
      const { calls } = mockApi();

      await tauriEmit('login', 'test');

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.emits.has('login'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: 'test',
      });
    });

    it('tauriListen', async () => {
      const { calls } = mockApi();

      await tauriListen('login', () => {
        //
      });

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.listeners.has('login'));
    });

    it('tauriInvoke', async () => {
      const { calls } = mockApi();

      await tauriInvoke('delete_note', { id: 'id' });

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('delete_note'));
      assert.deepEqual(calls.invoke[0]!.calledWith, {
        id: 'id',
      });

      clearMockApiResults({ calls });

      await tauriInvoke('get_all_notes');

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('get_all_notes'));
      assert.deepEqual(calls.invoke[0]!.calledWith, {});
    });
  });
});
