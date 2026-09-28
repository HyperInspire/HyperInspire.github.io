<script setup>
import DefaultNavbarBrand from '@vuepress/theme-default/components/VPNavbarBrand.vue'
import { computed } from 'vue'
import { RouteLink, usePageLang, useRouteLocale } from 'vuepress/client'

const release = __DOCS_RELEASE__
const lang = usePageLang()
const locale = useRouteLocale()
const description = computed(() => lang.value.startsWith('zh')
  ? `文档 ${release.version}：SDK ${release.sdkVersion} 的第 ${release.revision} 版文档`
  : `Documentation ${release.version}: revision ${release.revision} for SDK ${release.sdkVersion}`)
</script>

<template>
  <span class="docs-navbar-brand">
    <DefaultNavbarBrand />
    <RouteLink
      class="docs-version"
      :to="`${locale}introduction.html#documentation-version`"
      :title="description"
      :aria-label="description"
      :data-docs-version="release.version"
    >{{ release.version }}</RouteLink>
  </span>
</template>

<style scoped>
.docs-navbar-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  vertical-align: top;
  white-space: nowrap;
}

.docs-version {
  flex: none;
  padding: 0.12rem 0.45rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 5px;
  color: var(--vp-c-text-mute);
  background: var(--vp-c-bg-alt);
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.45;
}

.docs-version:hover,
.docs-version:focus-visible {
  border-color: var(--vp-c-accent);
  color: var(--vp-c-accent);
}

@media (max-width: 719px) {
  .docs-navbar-brand {
    gap: 0.35rem;
  }
}
</style>
