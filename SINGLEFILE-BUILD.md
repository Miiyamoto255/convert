# Convert HTML bundle build

This patch adds an experimental HTML-first build for `p2r3/convert` without changing the upstream `package.json` or `bun.lock`.

## What it produces

The workflow creates two GitHub Actions artifacts:

- `convert-html-bundle`: `convert.html` with the main app JavaScript and CSS inlined, plus required runtime files.
- `convert-full-site`: the normal upstream Vite build as a fallback.

The single-file plugin install is temporary in CI (`bun add --no-save vite-plugin-singlefile@2.3.4`). The project manifests and lockfile are not changed.

## Important limitation

This is **not** a single, double-clickable offline HTML file. The app's `mini-coi.js` is a service worker that supplies cross-origin isolation headers, and service workers must be served from a supported origin. FFmpeg also checks `crossOriginIsolated` before initializing. Worker scripts and some runtime assets therefore remain as sidecar files; the build deliberately preserves emitted JavaScript assets rather than deleting worker bundles.

To run the bundle locally, extract the whole `convert-html-bundle` artifact, then serve its directory over localhost, for example:

```bash
python -m http.server 8000 --directory dist-single
```

Open `http://127.0.0.1:8000/convert.html`. Do not open it using `file://` and do not move `convert.html` away from its supporting files.

## Add this patch to your fork

Extract the ZIP directly into the root of `Miiyamoto255/convert`, preserving its folder structure, then commit and push the added files. The ZIP paths already begin with `.github/`, `scripts/`, and the Vite config file. The workflow starts on pushes to `master` and can also be started manually from the Actions tab.

The browser smoke test verifies that the page mounts and has cross-origin isolation. It is not a full end-to-end test of every file-format conversion; the upstream test suite is also run before packaging.
