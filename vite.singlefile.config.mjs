import { mergeConfig } from "vite";
import baseConfig from "./vite.config.js";
import { viteSingleFile } from "vite-plugin-singlefile";

// Produce convert.html with the main app JS/CSS inlined.
// Keep emitted JS assets because Vite worker bundles are loaded separately.
// The service worker and copied runtime assets also remain as sidecar files.
export default mergeConfig(baseConfig, {
  plugins: [
    viteSingleFile({
      outputFileName: "convert.html",
      deleteInlinedFiles: false,
    }),
  ],
  build: {
    outDir: "dist-single",
    emptyOutDir: true,
  },
});
