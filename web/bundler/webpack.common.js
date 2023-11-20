// Import necessary plugins and modules
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCSSExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

// Export the webpack configuration
module.exports = {
  // Entry point for the application, the main JavaScript file
  entry: path.resolve(__dirname, '../src/script.js'),

  // Output configuration for the bundled files
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, '../dist'),
  },

  // Source map generation for better debugging
  devtool: 'source-map',

  // Array of plugins to enhance the webpack build process
  plugins: [
    // CopyWebpackPlugin for copying static assets to the 'dist' directory
    new CopyWebpackPlugin({
      patterns: [{ from: path.resolve(__dirname, '../static') }],
    }),

    // HtmlWebpackPlugin for generating an HTML file from a template
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, '../src/index.html'),
      minify: true,
    }),

    // MiniCSSExtractPlugin for extracting CSS into separate files
    new MiniCSSExtractPlugin(),
  ],

  // Module configuration for defining how different file types should be processed
  module: {
    rules: [
      // HTML
      {
        test: /\.(html)$/,
        use: ['html-loader'],
      },

      // JS
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },

      // CSS
      {
        test: /\.css$/,
        use: [MiniCSSExtractPlugin.loader, 'css-loader'],
      },

      // Images
      {
        test: /\.(jpg|png|gif|svg|hdr)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              outputPath: 'assets/',
            },
          },
        ],
      },

      // Fonts
      {
        test: /\.(ttf|eot|woff|woff2)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              outputPath: 'assets/fonts/',
            },
          },
        ],
      },

      // Videos
      {
        test: /\.m4v$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'assets/menu/',
            },
          },
        ],
      },
    ],
  },
};
