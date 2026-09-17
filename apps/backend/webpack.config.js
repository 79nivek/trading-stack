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
    bcrypt: 'commonjs bcrypt',
    amqplib: 'commonjs amqplib',
    'amqp-connection-manager': 'commonjs amqp-connection-manager',
    nats: 'commonjs nats',
    kafkajs: 'commonjs kafkajs',
    '@grpc/grpc-js': 'commonjs @grpc/grpc-js',
    '@grpc/proto-loader': 'commonjs @grpc/proto-loader',
    mqtt: 'commonjs mqtt',
    ioredis: 'commonjs ioredis',
    '@nestjs/platform-socket.io': 'commonjs @nestjs/platform-socket.io',
    '@nestjs/microservices': 'commonjs @nestjs/microservices',
    '@nestjs/microservices/microservices-module': 'commonjs @nestjs/microservices/microservices-module',
    '@nestjs/websockets/socket-module': 'commonjs @nestjs/websockets/socket-module',
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
      resourceRegExp: /^(zlib-sync|bufferutil|utf-8-validate|amqplib|amqp-connection-manager|nats|kafkajs|@grpc\/grpc-js|@grpc\/proto-loader|mqtt|ioredis|@nestjs\/platform-socket\.io|@nestjs\/microservices|@nestjs\/microservices\/microservices-module|@nestjs\/websockets\/socket-module)$/,
    }),
  ],
  ignoreWarnings: [
    /Failed to parse source map/,
    /Critical dependency/,
    /Module not found.*/,
  ],
};
