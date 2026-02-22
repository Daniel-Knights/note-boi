import { Note, PersistentStorage } from '../../../classes';
import { MAX_BACKUPS_COUNT } from '../../../constant';
import { isDesktop, tauriInvoke } from '../../../utils';

export async function backupNotes(notes: Note[]): Promise<void> {
  if (isDesktop()) {
    await tauriInvoke('backup_notes', {
      notes,
      maxBackupsCount: MAX_BACKUPS_COUNT,
    });

    return;
  }

  //// Web

  const existingNotesBackup = PersistentStorage.getJSON('NOTES_BACKUP') ?? {};

  const newNotesBackup = {
    [Date.now().toString()]: notes,
    ...existingNotesBackup,
  };

  const existingBackupKeys = Object.keys(existingNotesBackup);

  if (existingBackupKeys.length >= MAX_BACKUPS_COUNT) {
    const firstKey = existingBackupKeys[0]!;
    const firstKeyDate = new Date(parseInt(firstKey));

    const oldestBackupDate = existingBackupKeys.slice(1).reduce((oldestKeyDate, curr) => {
      const currKeyDate = new Date(parseInt(curr));

      return currKeyDate < oldestKeyDate ? currKeyDate : oldestKeyDate;
    }, firstKeyDate);

    delete newNotesBackup[`${oldestBackupDate.getTime()}`];
  }

  PersistentStorage.setJSON('NOTES_BACKUP', newNotesBackup);
}
