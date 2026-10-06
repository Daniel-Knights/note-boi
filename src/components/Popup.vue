<template>
  <Teleport to="#app">
    <div class="popup" v-bind="$attrs">
      <div
        @keydown="trapFocus"
        class="popup__content"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="labelledBy"
        tabindex="-1"
        ref="content"
      >
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';

const emit = defineEmits(['close']);
defineProps<{
  /** Id of the element that labels the dialog. */
  labelledBy?: string;
}>();

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const content = useTemplateRef('content');

const openerEl = document.activeElement as HTMLElement | null;
const inertEls: Element[] = [];

const hasClosed = ref(false);

function closePopup() {
  // Prevent unmount calling this a 2nd time
  if (hasClosed.value) return;
  hasClosed.value = true;

  window.removeEventListener('keydown', keyboardCloseHandler);
  document.body.removeEventListener('mouseup', clickCloseHandler);

  emit('close');
}

function getFocusableEls(): HTMLElement[] {
  return Array.from(
    content.value?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
  );
}

/** Keeps Tab focus within the dialog. */
function trapFocus(ev: KeyboardEvent) {
  if (ev.key !== 'Tab') return;

  const focusable = getFocusableEls();
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (!first || !last) {
    ev.preventDefault();
    content.value?.focus();

    return;
  }

  const active = document.activeElement;

  if (ev.shiftKey && (active === first || active === content.value)) {
    ev.preventDefault();
    last.focus();
  } else if (!ev.shiftKey && active === last) {
    ev.preventDefault();
    first.focus();
  }
}

function keyboardCloseHandler(event: KeyboardEvent) {
  if (event.key === 'Escape') closePopup();
}
function clickCloseHandler(event: MouseEvent) {
  if (!(event.target as HTMLElement)?.closest('.popup__content')) {
    closePopup();
  }
}

window.addEventListener('keydown', keyboardCloseHandler);
document.body.addEventListener('mouseup', clickCloseHandler);

onMounted(() => {
  // Make everything behind the dialog inert
  const popupEl = content.value?.closest('.popup');
  const appEl = popupEl?.closest('#app');

  Array.from(appEl?.children ?? []).forEach((el) => {
    if (el.contains(popupEl ?? null) || el.hasAttribute('inert')) return;

    el.setAttribute('inert', '');
    inertEls.push(el);
  });

  // Child components may already have focused something (e.g. a form input)
  if (!content.value?.contains(document.activeElement)) {
    (getFocusableEls()[0] ?? content.value)?.focus();
  }
});

onBeforeUnmount(() => {
  closePopup();

  inertEls.forEach((el) => el.removeAttribute('inert'));

  if (openerEl?.isConnected) openerEl.focus();
});
</script>

<style lang="scss" scoped>
@use '../sass/vars' as v;

.popup {
  @include v.flex-x(center, center);
  position: fixed;
  @include v.cover;
  @include v.equal-dimensions(100%);
  text-align: center;
  background-color: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  z-index: 100;

  &__content {
    &:focus {
      outline: none; // Only focused programmatically as a fallback
    }

    padding: 1em;
    max-width: min(95vw, 400px);
    color: var(--colour__primary);
    background-color: var(--colour__secondary);
  }
}
</style>
