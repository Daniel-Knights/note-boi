import { DeletedNote } from '../../api';

export type UnsyncedEventDetail =
  | {
      note: string;
      kind: 'edited';
    }
  | {
      note: DeletedNote;
      kind: 'deleted';
    };
