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

type NoteContent = {
  title: string;
  body: string;
  delta: Partial<Delta>;
};
