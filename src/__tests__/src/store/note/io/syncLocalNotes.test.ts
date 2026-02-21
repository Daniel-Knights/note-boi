import * as n from '../../../../../store/note';
import { Note } from '../../../../../classes';
import { clearMockApiResults, mockApi } from '../../../../mock';

describe('syncLocalNotes', () => {
  it('Calls sync_local_notes invoke with notes', () => {
    const { calls } = mockApi();
    const testNotes = [new Note(), new Note()];

    clearMockApiResults({ calls });

    n.syncLocalNotes(testNotes);

    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.invoke.has('sync_local_notes'));
    assert.deepEqual(calls.invoke[0]!.calledWith, { notes: testNotes });
  });
});
