import { Encryptor } from '../../classes';

import { getDummyNotes } from './dummyNotes';

export const passwordKey = await Encryptor.generatePasswordKey('1');
const encryptedNotes = await Encryptor.encryptNotes(getDummyNotes(), passwordKey);

export const getEncryptedNotes = () => structuredClone(encryptedNotes);
