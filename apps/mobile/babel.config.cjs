module.exports = function configureExpoBabel(api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo']
  };
};
