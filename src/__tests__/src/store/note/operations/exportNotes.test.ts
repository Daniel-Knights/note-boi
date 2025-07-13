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

  it('Catches error', async () => {
    const { calls, setErrorValue } = mockApi();
    const consoleErrorSpy = vi.spyOn(console, 'error');

    await n.getAllNotes();

    clearMockApiResults({ calls });
    setErrorValue.invoke('export_notes');

    await n.exportNotes(n.noteState.notes.map((nt) => nt.uuid));

    await waitUntil(() => calls.tauriApi.has('plugin:dialog|message'));

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Note invoke error:');
    expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('Mock Tauri Invoke error'));

    assert.strictEqual(calls.size, 2);
    assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
    assert.isTrue(calls.tauriApi.has('plugin:dialog|message'));
    assert.deepEqual(calls.tauriApi[1]!.calledWith, {
      message:
        'Something went wrong. Please try again or open an issue in the GitHub repo.',
      kind: 'error',
      okLabel: undefined,
      title: undefined,
    });
  });
});
