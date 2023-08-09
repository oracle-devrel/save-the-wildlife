const { merge } = require("webpack-merge");
const commonConfiguration = require("./webpack.common.js");
const portFinderSync = require("portfinder-sync");

const infoColor = (_message) => {
  return `\u001b[1m\u001b[34m${_message}\u001b[39m\u001b[22m`;
};

module.exports = merge(commonConfiguration, {
  mode: "development",
  devServer: {
    host: "localhost",
    port: portFinderSync.getPort(8080),
    contentBase: "./dist",
    watchContentBase: true,
    proxy: {
      "/socket.io": { target: "ws://localhost:3000" },
      "/api": { target: "ws://localhost:8080" },
    },
    open: true,
    https: false,
    useLocalIp: false,
    disableHostCheck: true,
    overlay: true,
    noInfo: true,
    after: function (app, server, compiler) {
      const port = server.options.port;
      const https = server.options.https ? "s" : "";
      const domain = `http${https}://localhost:${port}`;

      console.log(`Project running at:\n  - ${infoColor(domain)}`);
    },
  },
});
