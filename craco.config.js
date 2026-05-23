module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.target = 'web';
      return webpackConfig;
    },
  },
};
