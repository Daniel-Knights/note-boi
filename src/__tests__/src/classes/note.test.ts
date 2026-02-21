import { Note } from '../../../classes';
import { UUID_REGEX } from '../../../constant';
import { floorToThousand } from '../../utils';

describe('Note', () => {
  it('new Note()', () => {
    const emptyNote = new Note();
    const timestamp = Date.now();

    assert.strictEqual(typeof emptyNote.uuid, 'string');
    assert.lengthOf(emptyNote.uuid, 36);
    assert.isTrue(UUID_REGEX.test(emptyNote.uuid));
    assert.strictEqual(floorToThousand(emptyNote.timestamp), floorToThousand(timestamp));
    assert.deepEqual(emptyNote.content.delta, {
      ops: [],
    });
    assert.strictEqual(emptyNote.content.title, '');
    assert.strictEqual(emptyNote.content.body, '');
  });

  describe('fromJSONString', () => {
    it('Creates a Note from JSON string', () => {
      const jsonNote = {
        uuid: 'test-uuid-123',
        timestamp: 1234567890,
        content: {
          title: 'Test Title',
          body: 'Test Body',
          delta: { ops: [{ insert: 'Test Title\nTest Body' }] },
        },
      };

      const note = Note.fromJSONString(JSON.stringify(jsonNote));

      assert.strictEqual(note.uuid, 'test-uuid-123');
      assert.strictEqual(note.content.title, 'Test Title');
      assert.strictEqual(note.content.body, 'Test Body');
      assert.deepEqual(note.content.delta, {
        ops: [{ insert: 'Test Title\nTest Body' }],
      });
    });

    it('Applies overrides', () => {
      const jsonStr = JSON.stringify({
        uuid: 'original-uuid',
        content: {
          title: 'Title',
          body: 'Body',
          delta: { ops: [] },
        },
      });

      const overrides = {
        uuid: 'override-uuid',
        timestamp: 9999999999,
        content: {
          title: 'Override Title',
          body: 'Override body',
          delta: { ops: [] },
        },
      };

      const note = Note.fromJSONString(jsonStr, overrides);

      assert.strictEqual(note.uuid, overrides.uuid);
      assert.strictEqual(note.timestamp, overrides.timestamp);
      assert.strictEqual(note.content, overrides.content);
    });
  });

  describe('fromPlainString', () => {
    it('Creates a Note from plain string with title and body', () => {
      const plainStr = 'My Title\nMy Body\nMore body text';

      const note = Note.fromPlainString(plainStr);

      assert.strictEqual(note.content.title, 'My Title');
      assert.strictEqual(note.content.body, 'My Body');
      assert.deepEqual(note.content.delta, {
        ops: [{ insert: plainStr }],
      });
    });

    it('Handles string with only title', () => {
      const plainStr = 'Just a title';

      const note = Note.fromPlainString(plainStr);

      assert.strictEqual(note.content.title, 'Just a title');
      assert.strictEqual(note.content.body, '');
    });

    it('Applies overrides', () => {
      const overrides = {
        uuid: 'override-uuid',
        timestamp: 9999999999,
        content: {
          title: 'Override Title',
          body: 'Override body',
          delta: { ops: [] },
        },
      };

      const note = Note.fromPlainString('Title\nBody', overrides);

      assert.strictEqual(note.uuid, overrides.uuid);
      assert.strictEqual(note.timestamp, overrides.timestamp);
      assert.strictEqual(note.content, overrides.content);
    });
  });

  describe('parseTitleAndBody', () => {
    it('Parses title and body from string', () => {
      const result = Note.parseTitleAndBody('Title\nBody text here');

      assert.strictEqual(result.title, 'Title');
      assert.strictEqual(result.body, 'Body text here');
    });

    it('Handles string with only title', () => {
      const result = Note.parseTitleAndBody('Only title');

      assert.strictEqual(result.title, 'Only title');
      assert.strictEqual(result.body, '');
    });

    it('Handles empty string', () => {
      const result = Note.parseTitleAndBody('');

      assert.strictEqual(result.title, '');
      assert.strictEqual(result.body, '');
    });

    it('Trims whitespace', () => {
      const result = Note.parseTitleAndBody('  Title  \n  Body  ');

      assert.strictEqual(result.title, 'Title');
      assert.strictEqual(result.body, 'Body');
    });

    it('Handles multiple newlines', () => {
      const result = Note.parseTitleAndBody('Title\n\n\nBody with gaps');

      assert.strictEqual(result.title, 'Title');
      assert.strictEqual(result.body, 'Body with gaps');
    });
  });

  describe('clone', () => {
    it('Creates a deep copy of a note', () => {
      const original = new Note({
        uuid: 'test-uuid',
        timestamp: 1234567890,
        content: {
          title: 'Original Title',
          body: 'Original Body',
          delta: { ops: [{ insert: 'text' }] },
        },
      });

      const cloned = original.clone();

      assert.deepEqual(original, cloned);
    });

    it('Creates independent copy (mutations do not affect original)', () => {
      const original = new Note({
        content: {
          title: 'Title',
          body: 'Body',
          delta: { ops: [{ insert: 'text' }] },
        },
      });

      const cloned = original.clone();

      cloned.content.title = 'Modified Title';
      cloned.content.delta.ops = [];

      assert.strictEqual(original.content.title, 'Title');
      assert.lengthOf(original.content.delta.ops!, 1);
    });
  });

  describe('getText', () => {
    it('Extracts text from delta ops', () => {
      const note = new Note({
        content: {
          title: '',
          body: '',
          delta: {
            ops: [{ insert: 'Hello ' }, { insert: 'World' }, { insert: '!' }],
          },
        },
      });

      assert.strictEqual(note.getText(), 'Hello World!');
    });

    it('Ignores non-string inserts', () => {
      const note = new Note({
        content: {
          title: '',
          body: '',
          delta: {
            ops: [
              { insert: 'Text' },
              { insert: { image: 'url' } },
              { insert: ' more text' },
            ],
          },
        },
      });

      assert.strictEqual(note.getText(), 'Text more text');
    });

    it('Returns empty string for empty delta', () => {
      const note = new Note();

      assert.strictEqual(note.getText(), '');
    });
  });
});
