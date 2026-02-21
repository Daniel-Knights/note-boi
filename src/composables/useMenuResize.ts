import { computed, ref } from 'vue';

import { Storage } from '../classes';
import { MIN_MENU_WIDTH } from '../constant';
import { mathClamp } from '../utils';

export function useMenuResize(
  isSmallScreen: () => boolean,
  emit: (event: 'update:showNoteMenu', value: boolean) => void
) {
  const isDragging = ref(false);
  const menuWidthDesktop = ref(Storage.get('MENU_WIDTH') || '260px');

  const menuWidth = computed(() => (isSmallScreen() ? '100vw' : menuWidthDesktop.value));

  function handleDragBar() {
    isDragging.value = true;

    function handleDragBarMouseMove(ev: MouseEvent) {
      if (!isDragging.value) return;

      const halfWindowWidth = Math.floor(window.innerWidth / 2);

      emit('update:showNoteMenu', ev.clientX >= MIN_MENU_WIDTH);
      menuWidthDesktop.value = `${mathClamp(ev.clientX, MIN_MENU_WIDTH, halfWindowWidth)}px`;
    }

    document.addEventListener('mousemove', handleDragBarMouseMove);

    document.addEventListener(
      'mouseup',
      () => {
        isDragging.value = false;

        Storage.set('MENU_WIDTH', menuWidthDesktop.value);
        document.removeEventListener('mousemove', handleDragBarMouseMove);
      },
      { once: true }
    );
  }

  return {
    isDragging,
    menuWidth,
    menuWidthDesktop,
    handleDragBar,
  };
}
