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

  console[fnName] = (...messages: unknown[]) => {
    original(...messages);

    if (messages[0] instanceof Error) {
      logger(messages[0].name);
      logger(messages[0].message);
      logger(messages[0].stack?.replaceAll(/\n/g, '\n    ') || '');

      return;
    }

    messages.forEach((msg) => {
      if (typeof msg === 'object') {
        logger(JSON.stringify(msg));
      }

      logger(String(msg));
    });
  };
}
