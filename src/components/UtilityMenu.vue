<template>
  <div id="utility-menu">
    <Logout />
    <Settings />
  </div>
</template>

<script lang="ts" setup>
import Logout from './Logout.vue';
import Settings from './Settings.vue';
</script>

<style lang="scss">
@use '../sass/vars' as v;

#utility-menu {
  @include v.flex-y;
  position: absolute;
  right: v.$utility-menu-right;
  top: v.$editor-date-height;
  padding-top: 14px;
  height: calc(100% - v.$editor-date-height);

  button {
    @include v.equal-dimensions(v.$utility-menu-width);

    + * {
      margin-top: 12px;
    }
  }
}
</style>
