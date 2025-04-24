import * as s from '../../../store/sync';
import { FetchBuilder } from '../../../classes';
import { mockApi } from '../../api';

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

    const res = await new FetchBuilder('/auth/login')
      .method('POST')
      .headers(testHeaders)
      .body(body)
      .fetch();

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(`${FetchBuilder.serverUrl}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        ...FetchBuilder.defaultHeaders,
        ...testHeaders,
      },
    });

    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.request.has('/auth/login'));
    assert.deepEqual(res, {
      ok: true,
      data: {
        notes: [],
      },
      status: 200,
    });
  });

  it('With auth', async () => {
    const { calls } = mockApi();

    const fetchSpy = vi.spyOn(window, 'fetch');

    // Mock request expects this
    s.syncState.loadingCount = 1;

    const res = await new FetchBuilder('/notes/pull')
      .method('POST')
      .headers(testHeaders)
      .fetch();

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(`${FetchBuilder.serverUrl}/api/notes/pull`, {
      method: 'POST',
      // TODO: check this is still needed
      credentials: 'same-origin',
      headers: {
        ...FetchBuilder.defaultHeaders,
        ...testHeaders,
      },
    });

    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.request.has('/notes/pull'));
    assert.deepEqual(res, {
      ok: true,
      data: {
        notes: [],
      },
      status: 200,
    });
  });
});
