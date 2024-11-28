import { Note } from '../../store/note';
import {
  capitalise,
  hasKeys,
  isDev,
  isEmptyNote,
  isWhitespaceOnly,
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

  it('isWhitespaceOnly', () => {
    assert.isTrue(isWhitespaceOnly(''));
    assert.isTrue(isWhitespaceOnly(' '));
    assert.isTrue(isWhitespaceOnly('\n'));
    assert.isFalse(isWhitespaceOnly('Not whitespace'));
  });

  it('capitalise', () => {
    assert.strictEqual(capitalise('text'), 'Text');
    assert.strictEqual(capitalise('Text'), 'Text');
    assert.strictEqual(capitalise(''), '');
    assert.strictEqual(capitalise('t'), 'T');
    assert.strictEqual(capitalise('text text'), 'Text text');
    assert.strictEqual(capitalise('text-text'), 'Text-text');
    assert.strictEqual(capitalise('tExT-TexT'), 'TExT-TexT');
  });

  it('isEmptyNote', () => {
    const note = new Note();

    assert.isFalse(isEmptyNote());
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

      await tauriEmit('auth', { is_logged_in: false });

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
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
