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
