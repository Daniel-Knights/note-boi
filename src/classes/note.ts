import type Delta from 'quill-delta';

export class Note {
  readonly uuid: string = crypto.randomUUID();
  timestamp = Date.now();
  content: NoteContent = {
    title: '',
    body: '',
    delta: {
      ops: [],
    },
  };
}

type NoteContent = {
  title: string;
  body: string;
  delta: Partial<Delta>;
};
