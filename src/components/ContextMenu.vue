<template>
  <ul v-if="show" class="context-menu" :style="{ top: top + 'px', left: left + 'px' }">
    <li><button>New Note</button></li>
    <li><button>Delete Note</button></li>
    <li class="context-menu__has-sub-menu">
      <button>Theme</button>
      <ul>
        <li><button>Light</button></li>
        <li><button>Dark</button></li>
        <li><button>System</button></li>
      </ul>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

const show = ref(false);
const top = ref(0);
const left = ref(0);

const props = defineProps({
  ev: {
    type: MouseEvent || undefined,
    default: undefined,
  },
});

function hide() {
  show.value = false;
  document.removeEventListener('click', hide);
}

watch(props, () => {
  if (!props.ev) return;

  show.value = true;
  top.value = props.ev.clientY;
  left.value = props.ev.clientX;

  document.addEventListener('click', hide);
});
</script>

<style lang="scss" scoped>
$list-padding: 3px;
$list-bg-color: var(--color__interactive);

ul {
  position: absolute;
  width: 133px;
  color: var(--color__secondary);
  background-color: $list-bg-color;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  z-index: 10;
}

li {
  cursor: pointer;
  padding: 0.5em 1em;
  white-space: nowrap;
  border: $list-padding solid $list-bg-color;

  &:hover {
    color: var(--color__primary);
    background-color: var(--color__tertiary);
  }
}

.context-menu__has-sub-menu {
  position: relative;

  &:hover {
    > ul {
      display: block;
    }
  }

  > ul {
    display: none;
    top: -$list-padding;
    left: calc(100% + $list-padding);
  }
}
</style>
