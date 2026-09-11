const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const webpack = require('webpack');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  externals: {
    'zlib-sync': 'commonjs zlib-sync',
    bufferutil: 'commonjs bufferutil',
    'utf-8-validate': 'commonjs utf-8-validate',
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: true,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^(zlib-sync|bufferutil|utf-8-validate)$/,
    }),
  ],
  ignoreWarnings: [
    /Failed to parse source map/,
    /Critical dependency/,
    /Module not found.*/,
  ],
};
