import { selectedTheme, setTheme } from '../../../store/theme';

describe('Theme', () => {
  it('Uses system as default', () => {
    assert.strictEqual(selectedTheme.value, 'System');
    assert.isTrue(document.body.classList.contains('theme--system'));
  });

  it('setTheme', () => {
    setTheme('Light');
    assert.strictEqual(selectedTheme.value, 'Light');
    assert.isTrue(document.body.classList.contains('theme--light'));
    setTheme('Dark');
    assert.strictEqual(selectedTheme.value, 'Dark');
    assert.isTrue(document.body.classList.contains('theme--dark'));
  });
});
