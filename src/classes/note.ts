import type Delta from 'quill-delta';

export class Note implements RawNote {
  readonly uuid;
  timestamp;
  content;

  constructor(noteData?: {
    uuid?: RawNote['uuid'];
    timestamp?: RawNote['timestamp'];
    content?: NoteContent;
  }) {
    this.uuid = noteData?.uuid ?? crypto.randomUUID();
    this.timestamp = noteData?.timestamp ?? Date.now();
    this.content = noteData?.content ?? {
      title: '',
      body: '',
      delta: {
        ops: [],
      },
    };
  }

  /**
   * Creates a Note instance from a stringified JSON representation.
   * @param overrides Overrides for properties passed to the constructor.
   */
  static fromJSONString(str: string, overrides?: Partial<RawNote>): Note {
    const { uuid, content } = JSON.parse(str);

    return new Note({ uuid, content, ...overrides });
  }

  /**
   * Creates a Note instance from a plain string representation.
   * @param overrides Overrides for properties passed to the constructor.
   */
  static fromPlainString(str: string, overrides?: Partial<RawNote>): Note {
    const { title, body } = this.parseTitleAndBody(str);

    return new Note({
      content: {
        title,
        body,
        delta: {
          ops: [{ insert: str }],
        },
      },
      ...overrides,
    });
  }

  /**
   * Returns an object consisting of the title and body parsed from the given string.
   */
  static parseTitleAndBody(str: string): { title: string; body: string } {
    const [title, body] = str.trimStart().split(/\n\s*/, 2);

    return {
      title: title!.trimEnd(),
      body: body?.trimEnd() ?? '',
    };
  }

  clone(): Note {
    return new Note({
      uuid: this.uuid,
      timestamp: this.timestamp,
      content: {
        ...this.content,
        delta: { ...this.content.delta },
        title: this.content.title,
        body: this.content.body,
      },
    });
  }

  // TODO: add DeletedNote class and abstract this method to a getTextFromDelta util so both classes can use it
  //       or just make this a helper to be used separately?
  /** Returns the full text content of the given note. */
  getText(): string {
    if (!this.content.delta.ops) return '';

    return this.content.delta.ops.reduce((acc, op) => {
      if (typeof op.insert === 'string') {
        return acc + op.insert;
      }

      return acc;
    }, '');
  }
}

//// Types

export type RawNote = {
  readonly uuid: string;
  timestamp: number;
  content: NoteContent;
};

export type NoteContent = {
  title: string;
  body: string;
  delta: Partial<Delta>;
};
