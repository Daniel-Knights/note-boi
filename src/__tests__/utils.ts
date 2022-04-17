import { DOMWrapper, VueWrapper } from '@vue/test-utils';
import { randomFillSync } from 'crypto';

import * as noteStore from '../store/note';

// jsdom doesn't come with a WebCrypto implementation
export function setCrypto(): void {
  window.crypto = {
    // @ts-expect-error strict typing unnecessary here
    getRandomValues: (array) => randomFillSync(array),
  };
}

export function mockPromise<T>(resValue?: T): Promise<T | void> {
  return new Promise((res) => {
    res(resValue);
  });
}

export function resetNoteStore(): void {
  noteStore.state.notes = [];
  noteStore.state.selectedNote = new noteStore.Note();
  noteStore.state.extraSelectedNotes = [];
}

export function getByTestId(
  wrapper: VueWrapper,
  id: 'new' | 'delete'
): Omit<DOMWrapper<Element>, 'exists'> {
  return wrapper.get(`[data-test-id="${id}"]`);
}
