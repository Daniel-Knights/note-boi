import { PersistentStorage } from '../../../classes';

describe('PersistentStorage', () => {
  it('get/set', () => {
    assert.isNull(PersistentStorage.get('USERNAME'));

    PersistentStorage.set('USERNAME', 'd');

    assert.strictEqual(PersistentStorage.get('USERNAME'), 'd');
  });

  it('remove', () => {
    PersistentStorage.set('USERNAME', 'd');

    PersistentStorage.remove('USERNAME');

    assert.isNull(PersistentStorage.get('USERNAME'));
  });

  it('clear', () => {
    PersistentStorage.set('USERNAME', 'd');
    PersistentStorage.set('THEME', 'Dark');

    PersistentStorage.clear();

    assert.isNull(PersistentStorage.get('USERNAME'));
    assert.isNull(PersistentStorage.get('THEME'));
  });

  it('setJSON/getJSON', () => {
    assert.isNull(PersistentStorage.getJSON('UNSYNCED'));

    const unsynced = {
      new: 'note1',
      edited: ['note2'],
      deleted: [{ uuid: 'note3', deleted_at: 0 }],
    };

    PersistentStorage.setJSON('UNSYNCED', unsynced);

    assert.deepEqual(PersistentStorage.getJSON('UNSYNCED'), unsynced);
  });
});
