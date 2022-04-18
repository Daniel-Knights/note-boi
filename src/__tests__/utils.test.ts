import { isEmptyNote, isWhitespaceOnly, unixToDateTime } from '../utils';
import { Note } from '../store/note';

describe('Utils', () => {
  it('Formats Unix time to date-time', () => {
    assert.strictEqual(unixToDateTime(1650003060221), '15 Apr 2022, 07:11');
  });

  it('Checks if a string is only whitespace', () => {
    assert.isTrue(isWhitespaceOnly(''));
    assert.isTrue(isWhitespaceOnly(' '));
    assert.isTrue(isWhitespaceOnly('\n'));
    assert.isFalse(isWhitespaceOnly('Not whitespace'));
  });

  it('Checks if a note is empty', () => {
    const note = new Note();

    assert.isTrue(isEmptyNote());
    assert.isTrue(isEmptyNote(note));
    note.timestamp = 1650003060221;
    assert.isTrue(isEmptyNote(note));
    note.content.body = 'Body';
    assert.isTrue(isEmptyNote(note));
    note.content.delta = 'Delta';
    assert.isTrue(isEmptyNote(note));
    note.content.title = 'Title';
    assert.isFalse(isEmptyNote(note));
  });
});
