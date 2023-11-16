const path = require("path");
const { merge } = require("webpack-merge");
const portFinderSync = require("portfinder-sync");
const commonConfiguration = require("./webpack.common.js");

module.exports = merge(commonConfiguration, {
  mode: "development",

  devServer: {
    host: "localhost",
    port: portFinderSync.getPort(8080),
    static: [
      {
        directory: path.resolve(__dirname, "dist"),
        watch: true,
      },
      {
        directory: path.resolve(__dirname, "static"),
        staticOptions: {},
        publicPath: "/static-public-path/",
        serveIndex: true,
        watch: true,
      },
    ],
    proxy: {
      "/socket.io": { target: "http://localhost:3000", ws: true },
      "/api": { target: "http://localhost:8080", ws: true },
    },
    open: true,
    https: false,
    allowedHosts: "all",
    onAfterSetupMiddleware: function (devServer) {
      devServer.app.get("/some/path", function (req, res) {
        res.json({ custom: "response" });
      });
    },
    client: {
      logging: "info",
      overlay: {
        errors: true,
        warnings: true,
      },
      progress: true,
      reconnect: true,
      webSocketTransport: "ws", 
      webSocketURL: {
        hostname: "localhost",
        pathname: "/ws",
        port: 8080,
      },
    },
  },
});
