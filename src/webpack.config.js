var path = require('path');

module.exports = {
  entry: './src/index',

  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'build'),
    publicPath: 'build/'
  },

  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
      { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader?limit=10000&minetype=application/font-woff" },
      { test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "file-loader" },
      { test: /\.jsx$/, loaders: ['react-hot-loader', '6to5?experimental'], exclude: /node_modules/ },
      { test: /\.js$/, loaders: ['react-hot-loader', '6to5?experimental'], exclude: /node_modules/ },
      { test: /\.json$/, loaders: ['json'], exclude: /node_modules/ }
    ]
  },

  resolve: {
    // you can now require('file') instead of require('file.coffee')
    extensions: ['', '.js', '.jsx', '.json'] 
  }
};

