import { mount } from '@vue/test-utils';

import type { Bounds } from '../../../components/types';
import { getByTestId } from '../../utils';

import FindInPage from '../../../components/FindInPage.vue';

const linebreaks = '\n'.repeat(20);
const rootEl = document.createElement('div');
const dummyBounds: Bounds[] = [];

const initialDummyBounds = [
  { top: 128, left: 34, width: 28, height: 18 },
  { top: 433, left: 67, width: 6, height: 18 },
  { top: 574, left: 128, width: 12, height: 18 },
  { top: 784, left: 13, width: 157, height: 40 },
  { top: 1283, left: 35, width: 12, height: 18 },
] satisfies Bounds[];

const defaultProps = {
  text: `How${linebreaks}Now${linebreaks}Brown${linebreaks}Cow${linebreaks}`.repeat(5),
  rootEl,
  getBoundsAtIndex: vi.fn(() => dummyBounds.shift()!),
} as const;

beforeEach(() => {
  // Reset dummy bounds, as `getBoundsAtIndex` shifts it
  dummyBounds.push(...initialDummyBounds);
});

describe('FindInPage', () => {
  it('Mounts', () => {
    const wrapper = mount(FindInPage, { props: defaultProps });

    assert.isTrue(wrapper.isVisible());
  });

  it('Closes', async () => {
    const wrapper = mount(FindInPage, { props: defaultProps });
    const closeButton = getByTestId(wrapper, 'close-button');

    await closeButton.trigger('click');

    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('Highlights searched text', async () => {
    const wrapper = mount(FindInPage, { props: defaultProps });
    const highlightsContainerEl = rootEl.children[0]!;

    await getByTestId(wrapper, 'input').setValue('Now');

    assert.strictEqual(highlightsContainerEl.childElementCount, 5);
    assertActiveEl(highlightsContainerEl, 0);

    // Assert correct positions for each highlight el
    initialDummyBounds.forEach((bounds, i) => {
      const highlightEl = highlightsContainerEl.children[i]! as HTMLSpanElement;

      assert.strictEqual(highlightEl.style.top, `${bounds.top}px`);
      assert.strictEqual(highlightEl.style.left, `${bounds.left}px`);
      assert.strictEqual(highlightEl.style.width, `${bounds.width}px`);
      assert.strictEqual(highlightEl.style.height, `${bounds.height}px`);
    });
  });

  it('Navigates highlights with up/down buttons', async () => {
    const wrapper = mount(FindInPage, { props: defaultProps });
    const highlightsContainerEl = rootEl.children[0]!;
    const prevButton = getByTestId(wrapper, 'nav-prev');
    const nextButton = getByTestId(wrapper, 'nav-next');

    await getByTestId(wrapper, 'input').setValue('Now');

    assert.strictEqual(highlightsContainerEl.childElementCount, 5);

    assertActiveEl(highlightsContainerEl, 0);
    await nextButton.trigger('click');
    assertActiveEl(highlightsContainerEl, 1);
    await prevButton.trigger('click');
    assertActiveEl(highlightsContainerEl, 0);
    await prevButton.trigger('click');
    assertActiveEl(highlightsContainerEl, 4);
    await nextButton.trigger('click');
    assertActiveEl(highlightsContainerEl, 0);
  });
});

//// Helpers

/**
 * Asserts that the highlight el at the given index is the currently active one,
 * and that there's only one active highlight at any time.
 */
function assertActiveEl(highlightsContainerEl: Element, i: number) {
  const ACTIVE_CLASS = 'search-highlight--active';

  assert.isTrue(highlightsContainerEl.children[i]?.classList.contains(ACTIVE_CLASS));
  // Ensure there's only one highlight el at any time
  assert.lengthOf(highlightsContainerEl.querySelectorAll(`.${ACTIVE_CLASS}`), 1);
}
