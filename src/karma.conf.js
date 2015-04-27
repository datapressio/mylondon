var webpack = require('webpack');

module.exports = function (config) {
    config.set({
        browsers: [ 'Chrome' ], //run in Chrome
//        singleRun: true, //just run once by default
        frameworks: [ 'mocha' ], //use the mocha test framework
        files: [
            'tests.webpack.js' //just load this file
        ],
        preprocessors: {
            'tests.webpack.js': [ 'webpack'], //preprocess with webpack and our sourcemap loader
            '**/*.jsx': [ 'webpack' ] //preprocess with webpack and our sourcemap loader
        },
        reporters: [ 'dots' ], //report results in this format
        webpack: { //kind of a copy of your webpack config
            devtool: 'inline-source-map', //just do inline source maps instead of the default
            module: {
                loaders: [
                    { test: /\.css$/, loader: 'style-loader!css-loader' },
                    { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader?limit=10000&minetype=application/font-woff" },
                    { test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "file-loader" },
                    { test: /\.jsx$/, loaders: ['babel-loader'], exclude: /node_modules/ },
                    { test: /\.js$/, loaders: ['babel-loader'], exclude: /node_modules/ },
                    { test: /\.json$/, loaders: ['json'], exclude: /node_modules/ }
                ]
            },
            resolve: {
              // you can now require('file') instead of require('file.coffee')
              extensions: ['', '.js', '.jsx', '.json'] 
            }
        },
        webpackServer: {
            noInfo: false//true //please don't spam the console when running in karma!
        }
    });
};

