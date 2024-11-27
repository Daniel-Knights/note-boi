import { forwardConsole, initLogger } from '../../log';

const originalConsole = { ...console };

afterEach(() => {
  console.log = originalConsole.log;
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('Log', () => {
  const mockLogger = vi.fn();

  it('initLogger', () => {
    console.log = mockLogger;
    console.debug = mockLogger;
    console.info = mockLogger;
    console.warn = mockLogger;
    console.error = mockLogger;

    assert.strictEqual(console.log, mockLogger);
    assert.strictEqual(console.debug, mockLogger);
    assert.strictEqual(console.info, mockLogger);
    assert.strictEqual(console.warn, mockLogger);
    assert.strictEqual(console.error, mockLogger);

    initLogger();

    assert.notStrictEqual(console.log, mockLogger);
    assert.notStrictEqual(console.debug, mockLogger);
    assert.notStrictEqual(console.info, mockLogger);
    assert.notStrictEqual(console.warn, mockLogger);
    assert.notStrictEqual(console.error, mockLogger);
  });

  describe('forwardConsole', () => {
    it('console.log', () => {
      forwardConsole('log', mockLogger);

      console.log('test message');

      expect(mockLogger).toHaveBeenCalledOnce();
      expect(mockLogger).toHaveBeenCalledWith('test message');
    });

    it('console.error', () => {
      const error = new Error('test error');

      forwardConsole('error', mockLogger);

      console.error(error);

      expect(mockLogger).toHaveBeenCalledTimes(3);
      expect(mockLogger).toHaveBeenCalledWith(error.name);
      expect(mockLogger).toHaveBeenCalledWith(error.message);
      expect(mockLogger).toHaveBeenCalledWith(
        error.stack?.replaceAll(/\n/g, '\n    ') || ''
      );
    });

    it('console.info', () => {
      const obj = { key: 'value' };

      forwardConsole('info', mockLogger);

      console.info(obj);

      expect(mockLogger).toHaveBeenCalledTimes(2);
      expect(mockLogger).toHaveBeenCalledWith(JSON.stringify(obj));
      expect(mockLogger).toHaveBeenCalledWith(String(obj));
    });

    it('console.warn', () => {
      forwardConsole('warn', mockLogger);

      console.warn(123);

      expect(mockLogger).toHaveBeenCalledOnce();
      expect(mockLogger).toHaveBeenCalledWith('123');
    });

    it('console.debug', () => {
      const message = 'test message';

      forwardConsole('debug', mockLogger);

      console.debug(message);

      expect(mockLogger).toHaveBeenCalledOnce();
      expect(mockLogger).toHaveBeenCalledWith(message);
    });
  });
});
