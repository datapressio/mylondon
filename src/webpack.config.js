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
      // Pass *.jsx files through jsx-loader transform
      // { test: /\.jsx$/, loader: 'jsx-loader?harmony' },
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

