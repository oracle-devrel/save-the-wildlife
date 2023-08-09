import { io } from "socket.io-client";

let socket;

function start(wsURL) {
  logger(`WebWorker commsWorker start on "${wsURL}"`);
  socket = io(wsURL, { transports: ["websocket"] });

  socket.io.on("error", (error) => postMessage({ error }));

  socket.on("connect_error", (error) => postMessage({ error }));

  socket.on("connect", () => {
    postMessage({ type: "connect" });
  });

  socket.on("disconnect", () => {
    postMessage({ type: "disconnect" });
  });

  socket.on("allPlayers", (data) => {
    postMessage({ type: "allPlayers", body: data });
  });

  socket.on("items", (data) => {
    postMessage({ type: "items", body: data });
  });

  socket.on("player.new", (data) => {
    postMessage({ type: "player.new", body: data });
  });

  // setInterval(() => {
  //   postMessage({ type: "refresh", data: cache });
  // }, 1000);

  socket.on("player.delete", (data) => {
    postMessage({ type: "player.delete", body: data });
  });
}

onmessage = ({ data }) => {
  switch (data.type) {
    case "player.trace":
      socket.emit("player.trace", data.body);
      break;
    case "start":
      start(data.body);
      break;
    default:
      break;
  }
};

function logger(message) {
  postMessage({ type: "log", body: message });
}
