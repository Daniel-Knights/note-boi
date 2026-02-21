import * as n from '../../../../../store/note';
import { Note } from '../../../../../classes';
import { MAX_BACKUPS_COUNT } from '../../../../../constant';
import { clearMockApiResults, mockApi } from '../../../../mock';

describe('backupNotes', () => {
  it('Calls backup_notes invoke with notes and maxBackupsCount', async () => {
    const { calls } = mockApi();
    const testNotes = [new Note(), new Note()];

    clearMockApiResults({ calls });

    await n.backupNotes(testNotes);

    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.invoke.has('backup_notes'));
    assert.deepEqual(calls.invoke[0]!.calledWith, {
      notes: testNotes,
      maxBackupsCount: MAX_BACKUPS_COUNT,
    });
  });
});
