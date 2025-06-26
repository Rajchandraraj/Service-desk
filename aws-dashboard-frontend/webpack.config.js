module.exports = {
  // ...other config...
  module: {
    rules: [
      // ...other rules...
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: [
          /node_modules\/react-datepicker/
        ],
      },
    ],
  },
  // ...other config...
};