import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: 'src/index.ts',
  output: [
    {
      dir: './dist',
      entryFileNames: 'index.common.js',
      format: 'cjs',
    },
    {
      dir: './dist',
      entryFileNames: 'index.esm.js',
      format: 'esm',
    },
  ],
  plugins: [
    nodeResolve({
      extensions: ['.js'],
      preferBuiltins: false
    }),
    typescript(
      {
        declaration: true,
        declarationDir: 'dist/types/',
      }
    ),
    commonjs({ extensions: ['.js'] }),
    json(),
    // terser()
  ],
  external: [ 'net' ]
};