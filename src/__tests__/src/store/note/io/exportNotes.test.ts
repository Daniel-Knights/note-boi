import * as n from '../../../../../store/note';
import { clearMockApiResults, mockApi } from '../../../../mock';
import { waitUntil } from '../../../../utils';

describe('exportNotes', () => {
  it('All notes', async () => {
    const { calls } = mockApi();

    await n.getAllNotes();

    clearMockApiResults({ calls });

    await n.exportNotes(n.noteState.notes.map((nt) => nt.uuid));

    assert.strictEqual(calls.size, 2);
    assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
    assert.isTrue(calls.invoke.has('export_notes'));
    assert.deepEqual(calls.tauriApi[0]!.calledWith, {
      directory: true,
      multiple: false,
      recursive: false,
      title: 'Choose a location',
    });
  });

  it('Returns when no location chosen', async () => {
    const { calls, setResValues } = mockApi();

    await n.getAllNotes();

    clearMockApiResults({ calls });
    setResValues.tauriApi({ openDialog: [''] });

    await n.exportNotes(n.noteState.notes.map((nt) => nt.uuid));

    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
  });

  it('Passed selection of notes', async () => {
    const { calls } = mockApi();

    await n.getAllNotes();

    clearMockApiResults({ calls });

    await n.exportNotes([n.noteState.notes[0]!.uuid]);

    assert.strictEqual(calls.size, 2);
    assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
    assert.isTrue(calls.invoke.has('export_notes'));
  });

  it('Catches errors and tries again', async () => {
    const { calls, setErrorValue, setResValues } = mockApi();
    const consoleErrorSpy = vi.spyOn(console, 'error');

    await n.getAllNotes();

    clearMockApiResults({ calls });
    setErrorValue.tauriApi('plugin:dialog|open');
    setResValues.tauriApi({ askDialog: [true, false] });

    await n.exportNotes(n.noteState.notes.map((nt) => nt.uuid));

    await waitUntil(() => calls.tauriApi.has('plugin:dialog|ask', 2));

    expect(consoleErrorSpy).toHaveBeenCalledTimes(4);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to open directory:');
    expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('Mock Tauri API error'));

    const expectedAskCalledWith = {
      title: 'Export notes',
      kind: 'error',
      message: 'Failed to open directory. Try again?',
    };

    assert.strictEqual(calls.size, 4);
    assert.isTrue(calls.tauriApi.has('plugin:dialog|open', 2));
    assert.isTrue(calls.tauriApi.has('plugin:dialog|ask', 2));
    assert.deepEqual(calls.tauriApi[1]!.calledWith, expectedAskCalledWith);
    assert.deepEqual(calls.tauriApi[3]!.calledWith, expectedAskCalledWith);
  });
});
