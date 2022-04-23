const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const manifestOptions = {};

module.exports = {
  mode: 'development',
  entry: {
    login: './src/login.js',
    host: './src/host.js',
    player: './src/player.js',
    play: './src/play.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.html$/i,
        loader: "html-loader",
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'login.html',
      template: 'src/login.html',
      chunks: ['login']
    }),
    new HtmlWebpackPlugin({
      filename: 'play.html',
      template: 'src/play.html',
      chunks: ['play']
    }),
    new HtmlWebpackPlugin({
      filename: '404.html',
      template: 'src/404.html',
      chunks: []
    }),
    new WebpackManifestPlugin(manifestOptions)
  ]
};
