import { openedPopup, PopupType } from '../../../store/popup';

describe('Popup', () => {
  it('Sets opened popup', () => {
    assert.isUndefined(openedPopup.value);
    openedPopup.value = PopupType.Auth;
    assert.strictEqual(openedPopup.value, PopupType.Auth);
    openedPopup.value = PopupType.Error;
    assert.strictEqual(openedPopup.value, PopupType.Error);
    openedPopup.value = PopupType.Info;
    assert.strictEqual(openedPopup.value, PopupType.Info);

    assert.strictEqual(Object.keys(PopupType).length, 4 * 2);
  });
});
