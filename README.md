# InspireFace documentation

Developer documentation in English and Chinese, built with VuePress.

```sh
npm ci
npm run docs:dev
```

Run `npm run docs:check` before publishing. It builds the site and checks links,
examples, translations and the displayed documentation version. GitHub Actions
deploys the generated site when updates are pushed to `main`.

## Documentation releases

The public version uses `SDK version.dN`: the SDK version comes from the
development source covered by the documentation, and `N` counts documentation
releases for that SDK version. Increment `N` for each published documentation
update. Start at `d1` when moving to a new SDK version.

`package.json` is the version source. npm requires a hyphen (`1.2.4-d7`);
the site displays a dot (`1.2.4.d7`). The navbar, Introduction and HTML metadata
all use this value.

For the next documentation release on the same SDK:

```sh
npm version 1.2.4-d8 --no-git-tag-version
npm run docs:check
```

This updates both package manifests without creating a commit or tag. Building
or previewing the site does not increment the version.
