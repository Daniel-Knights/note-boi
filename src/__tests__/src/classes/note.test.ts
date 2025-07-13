import { Note } from '../../../classes';
import { UUID_REGEX } from '../../constant';
import { floorToThousand } from '../../utils';

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
