// config-overrides.js
const { overrideDevServer } = require("customize-cra");

module.exports = {
  devServer: overrideDevServer((config) => {
    config.allowedHosts = "all";
    return config;
  }),
};
