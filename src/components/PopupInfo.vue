<template>
  <Popup @close="emit('close')">
    <div id="popup-info" data-test-id="popup-info">
      <h2>Info</h2>
      <dl class="popup-info__description-list">
        <div class="popup-info__description-pair" data-test-id="user">
          <dt>User:</dt>
          <dd class="popup-info__text-bold">{{ syncState.username }}</dd>
        </div>
        <div class="popup-info__description-pair" data-test-id="version">
          <dt>Version:</dt>
          <dd class="popup-info__text-bold">{{ version }}</dd>
        </div>
        <div class="popup-info__description-pair" data-test-id="repo">
          <dt>Repo:</dt>
          <dd>
            <a :href="pkg.repository.url" target="_blank">{{ pkg.repository.url }}</a>
          </dd>
        </div>
        <div class="popup-info__description-pair" data-test-id="issues">
          <dt>Issues:</dt>
          <dd>
            <a :href="`${pkg.repository.url}/issues`" target="_blank"
              >{{ pkg.repository.url }}/issues</a
            >
          </dd>
        </div>
      </dl>
    </div>
  </Popup>
</template>

<script lang="ts" setup>
import { app } from '@tauri-apps/api';
import { ref } from 'vue';

import pkg from '../../package.json';
import { syncState } from '../store/sync';

import Popup from './Popup.vue';

const emit = defineEmits(['close']);

const version = ref(pkg.version);

app.getVersion().then((v) => {
  version.value = v;
});
</script>

<style lang="scss" scoped>
.popup-info__description-pair {
  display: grid;
  grid-template-columns: 75px auto;
  margin-top: 12px;
  width: 270px;

  > .popup-info__text-bold {
    font-weight: 600;
  }
}
</style>
