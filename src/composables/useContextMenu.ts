import { onBeforeUnmount, ref } from 'vue';

import { LONG_PRESS_TIMEOUT } from '../constant';

export function useContextMenu() {
  const contextMenuEv = ref<MouseEvent | PointerEvent>();
  const longPressTimer = ref<number>();

  function handleContextMenu(ev: PointerEvent) {
    // Right-click (desktop) - contextmenu event already prevented by .prevent modifier
    contextMenuEv.value = ev;
  }

  function handlePointerDown(ev: PointerEvent) {
    if (ev.pointerType !== 'touch') return;

    // Long-press (mobile/touch)
    longPressTimer.value = window.setTimeout(() => {
      contextMenuEv.value = ev;
    }, LONG_PRESS_TIMEOUT);
  }

  function handlePointerMove() {
    if (!longPressTimer.value) return;

    // Cancel long press if user moves/scrolls
    clearTimeout(longPressTimer.value);
    longPressTimer.value = undefined;
  }

  function handlePointerUp() {
    if (!longPressTimer.value) return;

    // Clean up long press timer
    clearTimeout(longPressTimer.value);
    longPressTimer.value = undefined;
  }

  onBeforeUnmount(() => {
    clearTimeout(longPressTimer.value);
  });

  return {
    contextMenuEv,
    longPressTimer,
    handleContextMenu,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
