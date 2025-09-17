<template>
  <div id="find-in-page">
    <div class="find-in-page__input-container">
      <input
        type="search"
        @input="handleSearch"
        v-model="searchText"
        class="find-in-page__input"
        ref="search-input"
        data-test-id="input"
      />
      <div class="find-in-page__ordinal">
        <span>{{ currentIndex + 1 }}/{{ currentMatchBounds.length }}</span>
      </div>
    </div>
    <button
      class="find-in-page__button find-in-page__button--nav"
      @click="handlePrev"
      data-test-id="nav-prev"
    >
      <ChevronUpIcon />
    </button>
    <button
      class="find-in-page__button find-in-page__button--nav"
      @click="handleNext"
      data-test-id="nav-next"
    >
      <ChevronDownIcon />
    </button>
    <button
      class="find-in-page__button find-in-page__button--close"
      @click="handleClose"
      data-test-id="close-button"
    >
      <CloseIcon />
    </button>
  </div>
  <Teleport :to="rootEl">
    <div class="find-in-page-highlights-container">
      <span
        v-for="(bounds, i) in currentMatchBounds"
        :key="i"
        ref="highlight-els"
        class="search-highlight"
        :class="{ 'search-highlight--active': i === currentIndex }"
        :style="{
          top: `${bounds.top}px`,
          left: `${bounds.left}px`,
          height: `${bounds.height}px`,
          width: `${bounds.width}px`,
        }"
      ></span>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

import { escapeRegex } from '../utils';

import ChevronDownIcon from './svg/ChevronDownIcon.vue';
import ChevronUpIcon from './svg/ChevronUpIcon.vue';
import CloseIcon from './svg/CloseIcon.vue';

export type Bounds = {
  top: number;
  left: number;
  height: number;
  width: number;
};

const props = defineProps<{
  text: string;
  rootEl: HTMLElement;
  getBoundsAtIndex: (i: number, length: number) => Bounds | null;
}>();

const emit = defineEmits(['close']);

const searchInput = useTemplateRef('search-input');
const highlightEls = useTemplateRef('highlight-els');

const searchText = defineModel<string>();
const currentIndex = ref(-1);
const currentMatchBounds = ref<Bounds[]>([]);

const rootElResizeObserver = new ResizeObserver(() => {
  handleResize();
});

onMounted(() => {
  // `.focus()` doesn't work consistently here
  searchInput.value?.setSelectionRange(0, 0);
  searchInput.value?.click();
  rootElResizeObserver.observe(props.rootEl);
});

onBeforeUnmount(() => {
  clearHighlights();
  rootElResizeObserver.disconnect();
});

// Update highlights when text changes
watch(
  () => props.text,
  () => findAndHighlight()
);

//// Functions

async function handleSearch() {
  findAndHighlight();
  await nextTick(); // Wait for highlight els to render
  scrollToHighlight();
}

function handleNext() {
  if (currentMatchBounds.value.length === 0) return;

  currentIndex.value = (currentIndex.value + 1) % currentMatchBounds.value.length;

  scrollToHighlight();
}

function handlePrev() {
  if (currentMatchBounds.value.length === 0) return;

  currentIndex.value =
    currentIndex.value <= 0
      ? currentMatchBounds.value.length - 1
      : currentIndex.value - 1;

  scrollToHighlight();
}

function handleClose() {
  clearHighlights();
  emit('close');
}

function handleResize() {
  findAndHighlight();
}

function findAndHighlight() {
  clearHighlights();

  if (!searchText.value) return;

  const searchRegex = new RegExp(escapeRegex(searchText.value), 'g');
  const allMatches = [...props.text.matchAll(searchRegex)];
  if (allMatches.length === 0) return;

  currentIndex.value = 0;
  currentMatchBounds.value = matchesToBounds(allMatches);
}

function scrollToHighlight() {
  const highlightEl = highlightEls.value?.[currentIndex.value];
  if (!highlightEl) return;

  highlightEl.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
}

/** Converts `RegExp` matches to `Bounds`. */
function matchesToBounds(matches: RegExpMatchArray[]) {
  return matches
    .map((match) => {
      if (match.index === undefined) return;

      return props.getBoundsAtIndex(match.index, match[0].length);
    })
    .filter(Boolean) as Bounds[];
}

function clearHighlights() {
  currentMatchBounds.value = [];
  currentIndex.value = -1;
}
</script>

<style lang="scss">
@use '../sass/vars' as v;

.search-highlight {
  pointer-events: none;
  position: absolute;
  border: 1px solid yellow;
  z-index: 5;

  &--active {
    border: 1px solid orangered;
    background-color: rgba(orange, 0.4);
  }
}
</style>

<style lang="scss" scoped>
@use '../sass/vars' as v;

#find-in-page {
  @include v.flex-x(false, center);
  position: absolute;
  bottom: 0;
  left: 0;
  right: v.$utility-menu-width + v.$utility-menu-right;
  height: v.$find-in-page-height;
  background-color: var(--colour__primary);
  color: var(--colour__secondary);
  z-index: 10;
}

.find-in-page {
  &__input-container {
    display: flex;
    position: relative;
    height: 26px;
    width: 300px;
    color: var(--colour__primary);
    background-color: var(--colour__secondary);
  }

  &__input {
    flex-grow: 1;
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
    background-color: transparent;
    border: none;
    border-radius: 0;
    outline: none;
  }

  &__ordinal {
    @include v.flex-x(center, center);
    padding: 0 6px;
    font-size: 12px;
    color: var(--colour__primary);
    background-color: var(--colour__secondary);
  }

  &__button {
    cursor: pointer;
    margin-left: 6px;
    color: var(--colour__tertiary);

    &--nav {
      width: 24px;
    }

    &--close {
      width: 20px;
    }

    &:hover {
      color: var(--colour__highlight-hover);
    }
  }
}
</style>
