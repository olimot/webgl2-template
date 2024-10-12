import { defineConfig } from "vite";

export default defineConfig({
  base: "/webgl2-template/",
  root: "src",
  build: {
    target: 'esnext',
    outDir: "../dist",
    emptyOutDir: true,
  },
});
