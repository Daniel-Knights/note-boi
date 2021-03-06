import { Note } from '../store/note';
import { isEmptyNote, isWhitespaceOnly, unixToDateTime } from '../utils';

describe('Utils', () => {
  it('Formats Unix time to date-time', () => {
    const formattedDateTime = unixToDateTime(1650003060221);

    assert.isTrue(
      // First is for GitHub workflow, second is for local testing
      formattedDateTime === 'Apr 15, 2022, 6:11 AM' ||
        formattedDateTime === '15 Apr 2022, 07:11'
    );
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
});
