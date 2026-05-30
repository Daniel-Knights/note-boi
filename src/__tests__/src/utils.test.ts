import { Note } from '../../classes';
import {
  capitalise,
  escapeRegex,
  hasKeys,
  isDev,
  isEmptyNote,
  isWhitespaceOnly,
  mathClamp,
  tauriEmit,
  tauriInvoke,
  tauriListen,
  unixToDateTime,
} from '../../utils';
import { clearMockApiResults, mockApi } from '../mock';
import { waitUntil } from '../utils';

describe('Utils', () => {
  it('isDev', () => {
    assert.strictEqual(process.env.NODE_ENV, 'test');
    assert.isFalse(isDev());
  });

  it('unixToDateTime', () => {
    const formattedDateTime = unixToDateTime(1650003060221);

    // 6 is for GitHub workflow, 7 is for local testing
    assert.match(formattedDateTime, /Apr 15, 2022, (6|7):11 AM/);
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

  it('escapeRegex', () => {
    const input = 'foo-/\\^$*+?bar.()|[]{}baz';
    const expected = 'foo\\-\\/\\\\\\^\\$\\*\\+\\?bar\\.\\(\\)\\|\\[\\]\\{\\}baz';

    assert.strictEqual(escapeRegex(input), expected);
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

  it('mathClamp', () => {
    // Value within range
    assert.strictEqual(mathClamp(5, 0, 10), 5);
    assert.strictEqual(mathClamp(0, 0, 10), 0);
    assert.strictEqual(mathClamp(10, 0, 10), 10);

    // Value below min
    assert.strictEqual(mathClamp(-5, 0, 10), 0);
    assert.strictEqual(mathClamp(-100, 0, 10), 0);

    // Value above max
    assert.strictEqual(mathClamp(15, 0, 10), 10);
    assert.strictEqual(mathClamp(100, 0, 10), 10);

    // Negative ranges
    assert.strictEqual(mathClamp(-5, -10, -1), -5);
    assert.strictEqual(mathClamp(-15, -10, -1), -10);
    assert.strictEqual(mathClamp(0, -10, -1), -1);

    // Decimal values
    assert.strictEqual(mathClamp(5.5, 0, 10), 5.5);
    assert.strictEqual(mathClamp(10.1, 0, 10), 10);
    assert.strictEqual(mathClamp(-0.1, 0, 10), 0);
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

    describe('tauriInvoke', () => {
      it('Calls invoke with correct command and args', async () => {
        const { calls } = mockApi();

        await tauriInvoke('delete_notes', { notes: [] });

        assert.strictEqual(calls.size, 1);
        assert.isTrue(calls.invoke.has('delete_notes'));
        assert.deepEqual(calls.invoke[0]!.calledWith, {
          notes: [],
        });

        clearMockApiResults({ calls });

        await tauriInvoke('get_all_notes');

        assert.strictEqual(calls.size, 1);
        assert.isTrue(calls.invoke.has('get_all_notes'));
        assert.deepEqual(calls.invoke[0]!.calledWith, {});
      });

      it('Catches errors and rethrows', async () => {
        const { calls, setErrorValue } = mockApi();
        const consoleErrorSpy = vi.spyOn(console, 'error');

        clearMockApiResults({ calls });
        setErrorValue.invoke('delete_notes');

        await expect(
          tauriInvoke('delete_notes', { notes: [] }, { rethrowErrors: true })
        ).rejects.toThrow('Mock Tauri Invoke error');

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        assert.strictEqual(calls.size, 1);
        assert.isTrue(calls.invoke.has('delete_notes'));
      });

      it('Catches errors and retries', async () => {
        const { calls, setErrorValue, setResValues } = mockApi();
        const consoleErrorSpy = vi.spyOn(console, 'error');

        clearMockApiResults({ calls });
        setErrorValue.invoke('edit_note');
        setResValues.tauriApi({ askDialog: ['Yes', 'No'] });

        await tauriInvoke(
          'edit_note',
          { note: new Note() },
          {
            promptRetryOnError: true,
          }
        );

        await waitUntil(() => calls.tauriApi.has('plugin:dialog|message', 2));

        expect(consoleErrorSpy).toHaveBeenCalledTimes(4);
        expect(consoleErrorSpy).toHaveBeenCalledWith('edit_note error:');
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          new Error('Mock Tauri Invoke error')
        );

        assert.strictEqual(calls.size, 4);
        assert.isTrue(calls.invoke.has('edit_note', 2));
        assert.isTrue(calls.tauriApi.has('plugin:dialog|message', 2));
        assert.deepEqual(calls.tauriApi[1]!.calledWith, {
          title: 'Edit note',
          kind: 'error',
          message: 'Failed to edit note. Try again?',
        });
      });
    });
  });
});
