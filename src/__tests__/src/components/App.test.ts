import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import { Note } from '../../../classes';
import { MEDIA_QUERY_SMALL_SCREEN, MEDIA_QUERY_TOUCH_DEVICE } from '../../../constant';
import { noteState } from '../../../store/note';
import { updateState } from '../../../store/update';
import { mockApi } from '../../mock';
import { createMediaQueryListMock } from '../../utils';

import App from '../../../App.vue';
import Editor from '../../../components/Editor.vue';
import Loading from '../../../components/Loading.vue';
import NoteMenu from '../../../components/NoteMenu.vue';
import NoteMenuToggle from '../../../components/NoteMenuToggle.vue';
import Settings from '../../../components/Settings.vue';
import SyncStatus from '../../../components/SyncStatus.vue';

describe('App', () => {
  it('Mounts', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mount(App);

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.isTrue(wrapper.getComponent(NoteMenu).isVisible());
    assert.isTrue(wrapper.getComponent(Editor).isVisible());
    assert.isTrue(wrapper.getComponent(Settings).isVisible());
    assert.isTrue(wrapper.getComponent(SyncStatus).isVisible());
    assert.isFalse(wrapper.findComponent(Loading).exists());
    assert.strictEqual(calls.size, 3);
    assert.isTrue(calls.listeners.has('login'));
    assert.isTrue(calls.listeners.has('logout'));
    assert.isTrue(calls.listeners.has('signup'));
  });

  it('Shows loading spinner when update is downloading', async () => {
    mockApi();

    const wrapper = mount(App);

    updateState.isDownloading = true;
    await nextTick();

    assert.isTrue(wrapper.getComponent(Loading).isVisible());
  });

  it('Handles note menu toggling', async () => {
    mockApi();
    const wrapper = mount(App);
    const wrapperVm = wrapper.vm as unknown as {
      showNoteMenu: boolean;
    };
    const toggleButton = wrapper.getComponent(NoteMenuToggle);

    assert.strictEqual(wrapperVm.showNoteMenu, true);

    await toggleButton.trigger('click');

    assert.strictEqual(wrapperVm.showNoteMenu, false);

    await toggleButton.trigger('click');

    assert.strictEqual(wrapperVm.showNoteMenu, true);
  });

  describe('Media query logic', () => {
    let smallScreenMql: ReturnType<typeof createMediaQueryListMock>;
    let touchDeviceMql: ReturnType<typeof createMediaQueryListMock>;

    beforeEach(() => {
      smallScreenMql = createMediaQueryListMock();
      touchDeviceMql = createMediaQueryListMock();

      vi.stubGlobal('matchMedia', ((query: string) => {
        if (query === MEDIA_QUERY_SMALL_SCREEN) {
          return smallScreenMql;
        }
        if (query === MEDIA_QUERY_TOUCH_DEVICE) {
          return touchDeviceMql;
        }

        return createMediaQueryListMock();
      }) as unknown as typeof window.matchMedia);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('Initializes with menu shown on large screen', () => {
      mockApi();
      smallScreenMql.matches = false;

      const wrapper = mount(App);
      const wrapperVm = wrapper.vm as unknown as {
        showNoteMenu: boolean;
        isSmallScreen: boolean;
      };

      assert.strictEqual(wrapperVm.isSmallScreen, false);
      assert.strictEqual(wrapperVm.showNoteMenu, true);
    });

    it('Initializes with menu hidden on small screen', () => {
      mockApi();
      smallScreenMql.matches = true;

      const wrapper = mount(App);
      const wrapperVm = wrapper.vm as unknown as {
        showNoteMenu: boolean;
        isSmallScreen: boolean;
      };

      assert.strictEqual(wrapperVm.isSmallScreen, true);
      assert.strictEqual(wrapperVm.showNoteMenu, false);
    });

    it('Detects touch device', () => {
      mockApi();
      touchDeviceMql.matches = true;

      const wrapper = mount(App);
      const editor = wrapper.getComponent(Editor);

      assert.strictEqual(editor.props('isTouchDevice'), true);
    });

    it('Detects non-touch device', () => {
      mockApi();
      touchDeviceMql.matches = false;

      const wrapper = mount(App);
      const editor = wrapper.getComponent(Editor);

      assert.strictEqual(editor.props('isTouchDevice'), false);
    });

    it('Updates state when screen size changes to small', async () => {
      mockApi();
      smallScreenMql.matches = false;

      const wrapper = mount(App);
      const wrapperVm = wrapper.vm as unknown as {
        showNoteMenu: boolean;
        isSmallScreen: boolean;
      };

      assert.strictEqual(wrapperVm.isSmallScreen, false);
      assert.strictEqual(wrapperVm.showNoteMenu, true);

      smallScreenMql.trigger(true);
      await nextTick();

      assert.strictEqual(wrapperVm.isSmallScreen, true);
      assert.strictEqual(wrapperVm.showNoteMenu, false);
    });

    it('Updates state when screen size changes to large', async () => {
      mockApi();
      smallScreenMql.matches = true;

      const wrapper = mount(App);
      const wrapperVm = wrapper.vm as unknown as {
        showNoteMenu: boolean;
        isSmallScreen: boolean;
      };

      assert.strictEqual(wrapperVm.isSmallScreen, true);
      assert.strictEqual(wrapperVm.showNoteMenu, false);

      smallScreenMql.trigger(false);
      await nextTick();

      assert.strictEqual(wrapperVm.isSmallScreen, false);
      assert.strictEqual(wrapperVm.showNoteMenu, true);
    });

    it('Shows menu on small screen when multiple notes exist', async () => {
      const { promises } = mockApi();
      smallScreenMql.matches = true;

      const wrapper = mount(App);

      await Promise.all(promises);

      const wrapperVm = wrapper.vm as unknown as {
        showNoteMenu: boolean;
        isSmallScreen: boolean;
      };

      // Initially no notes (or one empty note), menu hidden
      assert.strictEqual(wrapperVm.showNoteMenu, false);

      // Add two notes to trigger menu display on small screen
      noteState.notes.push(new Note(), new Note());

      smallScreenMql.trigger(true);
      await nextTick();

      // Menu should show when there are multiple notes
      assert.strictEqual(wrapperVm.showNoteMenu, true);
    });

    it('Removes event listener on unmount', async () => {
      mockApi();
      const wrapper = mount(App);
      const wrapperVm = wrapper.vm as unknown as {
        isSmallScreen: boolean;
      };

      smallScreenMql.trigger(true);
      await nextTick();
      assert.strictEqual(wrapperVm.isSmallScreen, true);

      wrapper.unmount();

      smallScreenMql.trigger(false);
      await nextTick();

      // Component is unmounted, so state should not update
      assert.strictEqual(wrapperVm.isSmallScreen, true);
    });
  });
});
