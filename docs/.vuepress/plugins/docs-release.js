import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const { version } = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'))
const parts = /^(\d+\.\d+\.\d+)-d([1-9]\d*)$/.exec(version)
if (!parts) throw new Error('Use SDK_VERSION-dREVISION for package.json version, for example 1.2.4-d2')

export const docsRelease = Object.freeze({
  sdkVersion: parts[1],
  revision: Number(parts[2]),
  version: `${parts[1]}.d${parts[2]}`,
})

export const docsReleasePlugin = {
  name: 'docs-release',
  define: { __DOCS_RELEASE__: docsRelease },
  alias: {
    '@theme/VPNavbarBrand.vue': fileURLToPath(new URL('../components/VersionedNavbarBrand.vue', import.meta.url)),
  },
}
