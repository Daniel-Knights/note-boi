import * as s from '../../../store/sync';
import { FetchBuilder } from '../../../classes';
import { mockApi, mockDb, mockKeyring } from '../../mock';

describe('FetchBuilder', () => {
  const testHeaders = {
    'X-Test-Header': 'test',
  };

  it('Without auth', async () => {
    const { calls } = mockApi();

    const fetchSpy = vi.spyOn(window, 'fetch');
    const body = {
      username: 'd',
      password: '1',
      notes: [],
      deleted_notes: [],
    };

    s.syncState.loadingCount = 1; // Mock request expects this

    const res = await new FetchBuilder('/auth/login')
      .method('POST')
      .headers(testHeaders)
      .body(body)
      .fetch('d');

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(`${FetchBuilder.serverUrl}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        ...FetchBuilder.defaultHeaders,
        ...testHeaders,
      },
    });

    assert.strictEqual(calls.size, 2);
    assert.isTrue(calls.invoke.has('set_access_token'));
    assert.deepEqual(calls.invoke[0]!.calledWith, {
      username: 'd',
      accessToken: 'test-token',
    });
    assert.isTrue(calls.request.has('/auth/login'));
    assert.deepEqual(res, {
      ok: true,
      data: {
        note_diff: {
          added: mockDb.encryptedNotes,
          edited: [],
          deleted: [],
        },
        access_token: 'test-token',
      },
      status: 200,
    });
  });

  it('With auth', async () => {
    const { calls } = mockApi();

    const fetchSpy = vi.spyOn(window, 'fetch');

    // Mock request expects these
    s.syncState.loadingCount = 1;
    mockKeyring.d = 'test-token';

    const body = { notes: [], deleted_notes: [] };
    const res = await new FetchBuilder('/notes/sync')
      .method('POST')
      .headers(testHeaders)
      .body(body)
      .withAuth('d', 'test-token')
      .fetch('d');

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(`${FetchBuilder.serverUrl}/api/notes/sync`, {
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify(body),
      headers: {
        ...FetchBuilder.defaultHeaders,
        ...testHeaders,
        'X-Username': 'd',
        Authorization: 'Bearer test-token',
      },
    });

    assert.strictEqual(calls.size, 2);
    assert.isTrue(calls.invoke.has('set_access_token'));
    assert.deepEqual(calls.invoke[0]!.calledWith, {
      username: 'd',
      accessToken: 'test-token',
    });
    assert.isTrue(calls.request.has('/notes/sync'));
    assert.deepEqual(res, {
      ok: true,
      data: {
        note_diff: {
          added: mockDb.encryptedNotes,
          edited: [],
          deleted: [],
        },
        access_token: 'test-token',
      },
      status: 200,
    });
  });
});
