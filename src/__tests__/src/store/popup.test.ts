import { openedPopup, POPUP_TYPE } from '../../../store/popup';

describe('Popup', () => {
  it('Sets opened popup', () => {
    assert.isUndefined(openedPopup.value);
    openedPopup.value = POPUP_TYPE.AUTH;
    assert.strictEqual(openedPopup.value, POPUP_TYPE.AUTH);
    openedPopup.value = POPUP_TYPE.ERROR;
    assert.strictEqual(openedPopup.value, POPUP_TYPE.ERROR);
    openedPopup.value = POPUP_TYPE.INFO;
    assert.strictEqual(openedPopup.value, POPUP_TYPE.INFO);

    assert.lengthOf(Object.keys(POPUP_TYPE), 4);
  });
});
