import { Storage } from '../../../classes';

describe('Storage', () => {
  it('get/set', () => {
    assert.isNull(Storage.get('USERNAME'));

    Storage.set('USERNAME', 'd');

    assert.strictEqual(Storage.get('USERNAME'), 'd');
  });

  it('remove', () => {
    Storage.set('USERNAME', 'd');

    Storage.remove('USERNAME');

    assert.isNull(Storage.get('USERNAME'));
  });

  it('clear', () => {
    Storage.set('USERNAME', 'd');
    Storage.set('THEME', 'Dark');

    Storage.clear();

    assert.isNull(Storage.get('USERNAME'));
    assert.isNull(Storage.get('THEME'));
  });

  it('setJson/getJson', () => {
    assert.isNull(Storage.getJson('UNSYNCED'));

    const unsynced = {
      new: 'note1',
      edited: ['note2'],
      deleted: [{ id: 'note3', deleted_at: 0 }],
    };

    Storage.setJson('UNSYNCED', unsynced);

    assert.deepEqual(Storage.getJson('UNSYNCED'), unsynced);
  });
});
