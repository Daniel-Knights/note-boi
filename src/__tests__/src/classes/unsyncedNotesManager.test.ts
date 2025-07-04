import { UnsyncedNotesManager } from '../../../classes';
import { Storage } from '../../../classes/storage';

describe('UnsyncedNotesManager', () => {
  it('Initializes empty when no storage', () => {
    const manager = new UnsyncedNotesManager();

    assert.strictEqual(manager.new, '');
    assert.strictEqual(manager.edited.size, 0);
    assert.strictEqual(manager.deleted.length, 0);
  });

  it('Initializes with contents from storage', () => {
    Storage.setJson('UNSYNCED', {
      new: 'n1',
      edited: ['e1', 'e2'],
      deleted: [{ uuid: 'd1', deleted_at: 0 }],
    });

    const manager = new UnsyncedNotesManager();

    assert.strictEqual(manager.new, 'n1');
    assert.deepEqual(manager.edited, new Set(['e1', 'e2']));
    assert.deepEqual(manager.deleted, [{ uuid: 'd1', deleted_at: 0 }]);
  });

  it('size', () => {
    const manager = new UnsyncedNotesManager();

    manager.new = 'n';
    manager.edited.add('e');
    manager.deleted.push({ uuid: 'd', deleted_at: 0 });

    assert.strictEqual(manager.size, 2);
  });

  describe('clear', () => {
    it('Clears edited and deleted', () => {
      const manager = new UnsyncedNotesManager();
      const setJsonSpy = vi.spyOn(Storage, 'setJson');

      manager.new = 'n';
      manager.edited.add('e');
      manager.deleted.push({ uuid: 'd', deleted_at: 0 });
      manager.clear();
      manager.clear(false);

      assert.strictEqual(manager.new, 'n');
      assert.strictEqual(manager.edited.size, 0);
      assert.strictEqual(manager.deleted.length, 0);
      expect(setJsonSpy).toHaveBeenCalled();
    });

    it('Clears new, edited, and deleted', () => {
      const manager = new UnsyncedNotesManager();
      const removeSpy = vi.spyOn(Storage, 'remove');

      manager.new = 'n';
      manager.edited.add('e');
      manager.deleted.push({ uuid: 'd', deleted_at: 0 });
      manager.clear(true);

      assert.strictEqual(manager.new, '');
      assert.strictEqual(manager.edited.size, 0);
      assert.strictEqual(manager.deleted.length, 0);
      expect(removeSpy).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('Updates new, edited, and deleted', () => {
      const manager = new UnsyncedNotesManager();
      const setJsonSpy = vi.spyOn(Storage, 'setJson');

      manager.set({
        new: 'n1',
        edited: ['e1'],
        deleted: [{ uuid: 'd1', deleted_at: 0 }],
      });

      manager.set({
        new: 'n2',
        edited: ['e2'],
        deleted: [{ uuid: 'd2', deleted_at: 0 }],
      });

      assert.strictEqual(manager.new, 'n2');
      assert.deepEqual(manager.edited, new Set(['e1', 'e2']));
      assert.deepEqual(manager.deleted, [
        { uuid: 'd1', deleted_at: 0 },
        { uuid: 'd2', deleted_at: 0 },
      ]);
      expect(setJsonSpy).toHaveBeenCalled();
    });

    it('Removes edited note if also deleted', () => {
      const manager = new UnsyncedNotesManager();

      manager.set({ edited: ['e1', 'e2'] });
      manager.set({ deleted: [{ uuid: 'e1', deleted_at: 0 }] });

      assert.deepEqual(manager.edited, new Set(['e2']));
      assert.deepEqual(manager.deleted, [{ uuid: 'e1', deleted_at: 0 }]);
    });

    it('Resets new if in edited or deleted', () => {
      const manager = new UnsyncedNotesManager();

      manager.set({ new: 'n1' });
      manager.set({ edited: ['n1'] });

      assert.strictEqual(manager.new, '');

      manager.set({ new: 'n2' });
      manager.set({ deleted: [{ uuid: 'n2', deleted_at: 0 }] });

      assert.strictEqual(manager.new, '');
    });
  });

  describe('store', () => {
    it('Removes UNSYNCED if empty', () => {
      const manager = new UnsyncedNotesManager();
      const removeSpy = vi.spyOn(Storage, 'remove');
      const setJsonSpy = vi.spyOn(Storage, 'setJson');

      manager.store();

      expect(removeSpy).toHaveBeenCalledWith('UNSYNCED');
      expect(setJsonSpy).not.toHaveBeenCalled();
    });

    it('Sets UNSYNCED if not empty', () => {
      const manager = new UnsyncedNotesManager();
      const setJsonSpy = vi.spyOn(Storage, 'setJson');

      manager.new = 'n';
      manager.edited.add('e');
      manager.deleted.push({ uuid: 'd', deleted_at: 0 });
      manager.store();

      expect(setJsonSpy).toHaveBeenCalledWith('UNSYNCED', {
        new: 'n',
        edited: ['e'],
        deleted: [{ uuid: 'd', deleted_at: 0 }],
      });
    });
  });
});
