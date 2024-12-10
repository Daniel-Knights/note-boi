import * as s from '../../../store/sync';
import { FetchBuilder } from '../../../classes';
import { mockApi, mockKeyring } from '../../api';

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
    };

    s.syncState.loadingCount = 1; // Mock request expects this

    const res = await new FetchBuilder('/login')
      .method('POST')
      .headers(testHeaders)
      .body(body)
      .fetch('d');

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(`${FetchBuilder.serverUrl}/api/login`, {
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
    assert.isTrue(calls.request.has('/login'));
    assert.deepEqual(res, {
      ok: true,
      data: {
        notes: [],
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

    const res = await new FetchBuilder('/notes/pull')
      .method('POST')
      .headers(testHeaders)
      .withAuth('d', 'test-token')
      .fetch('d');

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(`${FetchBuilder.serverUrl}/api/notes/pull`, {
      method: 'POST',
      credentials: 'same-origin',
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
    assert.isTrue(calls.request.has('/notes/pull'));
    assert.deepEqual(res, {
      ok: true,
      data: {
        notes: [],
        access_token: 'test-token',
      },
      status: 200,
    });
  });
});
