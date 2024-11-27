import { debug, error, info, trace, warn } from '@tauri-apps/plugin-log';

/** Redirects all logs to the log file */
export function initLogger() {
  forwardConsole('log', trace);
  forwardConsole('debug', debug);
  forwardConsole('info', info);
  forwardConsole('warn', warn);
  forwardConsole('error', error);
}

export function forwardConsole(
  fnName: 'log' | 'debug' | 'info' | 'warn' | 'error',
  logger: (message: string) => Promise<void>
) {
  const original = console[fnName];

  console[fnName] = (message: unknown) => {
    original(message);

    if (message instanceof Error) {
      logger(message.name);
      logger(message.message);
      logger(message.stack?.replaceAll(/\n/g, '\n    ') || '');

      return;
    }

    if (typeof message === 'object') {
      logger(JSON.stringify(message));
    }

    logger(String(message));
  };
}
