const path            = require('path');
const webpack         = require('webpack');
const UglifyJsPlugin  = require('uglifyjs-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = function (gulpConfig) {
  // Webpack config settings
  const webpackConfig = {
    resolve: {
      modules: [__dirname, 'node_modules'],
      extensions: ['*', '.js', '.jsx']
    },
    output: {
      filename: 'scripts.min.js',
    },
    plugins: gulpConfig.mode === "production" ? [
      new UglifyJsPlugin({
        uglifyOptions: {
          ecma: 8,
          warnings: false,
          mangle: {
            properties: {
              // mangle property options
            }
          },
          output: {
            comments: false,
            beautify: false
          },
          toplevel: false,
          nameCache: null,
          ie8: false,
          keep_classnames: undefined,
          keep_fnames: false,
          safari10: false,
        }
      }),
      new BundleAnalyzerPlugin()
    ] : [new BundleAnalyzerPlugin()],
    watch: gulpConfig.mode === 'development',
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          enforce: 'pre',
          use: [{loader: 'eslint-loader'}],
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {presets: [['env']]},
            },
          ],
        },
      ],
    },
  };

  return webpackConfig;
};
