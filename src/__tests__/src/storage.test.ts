import { storage } from '../../storage';

describe('storage', () => {
  it('get/set', () => {
    assert.isNull(storage.get('USERNAME'));

    storage.set('USERNAME', 'd');

    assert.strictEqual(storage.get('USERNAME'), 'd');
  });

  it('remove', () => {
    storage.set('USERNAME', 'd');

    storage.remove('USERNAME');

    assert.isNull(storage.get('USERNAME'));
  });

  it('clear', () => {
    storage.set('USERNAME', 'd');
    storage.set('THEME', 'Dark');

    storage.clear();

    assert.isNull(storage.get('USERNAME'));
    assert.isNull(storage.get('THEME'));
  });

  it('setJson/getJson', () => {
    assert.isNull(storage.getJson('UNSYNCED'));

    const unsynced = { new: 'note1', edited: ['note2'], deleted: ['note3'] };

    storage.setJson('UNSYNCED', unsynced);

    assert.deepEqual(storage.getJson('UNSYNCED'), unsynced);
  });
});
