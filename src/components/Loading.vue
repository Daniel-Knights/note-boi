<template>
  <div id="loading">
    <svg class="loading__spinner" viewBox="0 0 95 95">
      <g transform="translate(-0.88095856,-1.2589302)">
        <circle cx="48.380959" cy="48.75893" r="40" />
      </g>
    </svg>
  </div>
</template>

<script lang="ts" setup></script>

<style lang="scss">
#loading {
  @include v.flex-x(center, center);
  position: fixed;
  @include v.cover;
  background-color: var(--colour__primary);
  z-index: 50;
}

.loading__spinner {
  display: block;
  padding: 10px 0;
  @include v.equal-dimensions(120px);
  animation: rotate 1s ease-out infinite;

  circle {
    fill-opacity: 0;
    stroke: var(--colour__secondary);
    stroke-width: 2;
    stroke-dasharray: 262;
    stroke-linecap: round;
    animation: loading-spinner 1s linear infinite;

    @keyframes loading-spinner {
      0%,
      100% {
        stroke-dashoffset: 72;
      }
      50% {
        stroke-dashoffset: 240;
      }
    }
  }

  @keyframes rotate {
    from {
      transform: rotate(-25deg);
    }
    to {
      transform: rotate(335deg);
    }
  }
}
</style>
