import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default {
  input: "./src/index.ts",
  output: [
    {
      file: "./dist/index.js",
      format: "esm",
      sourcemap: true,
    },
    {
      file: "./dist/index.umd.js",
      format: "umd",
      sourcemap: true,
      name: "PcPc",
      exports: "named",
    },
  ],
  plugins: [typescript(), terser()],
};
