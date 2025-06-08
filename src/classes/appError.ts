export const ERROR_CODE = {
  NONE: 0,
  UNKNOWN: 1,
  LOGIN: 2,
  SIGNUP: 3,
  LOGOUT: 4,
  // PUSH was 5
  // PULL was 6
  DELETE_ACCOUNT: 7,
  CHANGE_PASSWORD: 8,
  ENCRYPTOR: 9,
  FORM_VALIDATION: 10,
  SYNC: 11,
} as const;

type ErrorCodes = typeof ERROR_CODE;
type ErrorKey = keyof ErrorCodes;
type ErrorCode = ErrorCodes[ErrorKey];

// Using `unknown` here breaks inference
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ErrorConfig<T extends (...args: any) => void> = {
  code: ErrorCode;
  message?: string;
  originalError?: unknown;
  /** Function to call on 'Try again', and its arguments */
  retry?: {
    fn: T;
    args?: Parameters<T>;
  };
  /** Whether to display the error in a form and/or `SyncStatus` */
  display?: {
    form?: boolean;
    sync?: boolean;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class AppError<T extends (...args: any) => void = (...args: any) => void> {
  readonly code;
  readonly message;
  readonly display;
  readonly retryConfig;
  readonly originalError;

  constructor(config: ErrorConfig<T> = { code: ERROR_CODE.NONE }) {
    this.code = config.code;
    this.message = config.message;
    this.display = Object.freeze(config.display);
    this.retryConfig = Object.freeze(config.retry);
    this.originalError = config.originalError;

    this.retry = this.retry.bind(this);
  }

  get isNone() {
    return this.code === ERROR_CODE.NONE;
  }

  retry() {
    if (!this.retryConfig) return;

    const { fn, args } = this.retryConfig;

    return args ? fn(args) : fn();
  }
}
