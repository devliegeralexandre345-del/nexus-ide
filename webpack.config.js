const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  entry: './src/index.jsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProd ? '[name].[contenthash:8].js' : '[name].bundle.js',
    chunkFilename: isProd ? '[name].[contenthash:8].js' : '[name].chunk.js',
    clean: true,
  },
  target: 'web',
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { modules: false, targets: '> 0.5%, not dead' }],
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
      },
    ],
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        codemirror: {
          test: /[\\/]node_modules[\\/]@codemirror[\\/]/,
          name: 'codemirror',
          chunks: 'all',
          priority: 20,
        },
      },
    },
    ...(isProd ? {
      minimize: true,
      usedExports: true,
      sideEffects: true,
    } : {}),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      ...(isProd ? { minify: { collapseWhitespace: true, removeComments: true } } : {}),
    }),
    new MiniCssExtractPlugin({
      filename: isProd ? 'styles.[contenthash:8].css' : 'styles.css',
    }),
  ],
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
    static: { directory: path.join(__dirname, 'dist') },
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  performance: {
    hints: isProd ? 'warning' : false,
    maxAssetSize: 500000,
    maxEntrypointSize: 500000,
  },
};
