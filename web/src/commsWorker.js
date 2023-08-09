import { io } from "socket.io-client";

let socket;

function init(wsURL, yourId, yourName) {
  logger(`WebWorker commsWorker start on ${wsURL}`);
  socket = io(wsURL, { transports: ["websocket"] });

  logger(`I am ${yourName} with id ${yourId} joining the game`);
  socket.emit("player.info.joining", { id: yourId, name: yourName });

  socket.io.on("error", (error) => postMessage({ error }));

  socket.on("connect_error", (error) => postMessage({ error }));

  socket.on("connect", () => {
    postMessage({ type: "connect" });
  });

  socket.on("disconnect", () => {
    logger("disconnect event");
    postMessage({ type: "disconnect" });
  });

  socket.on("player.trace.all", (data) => {
    delete data[yourId];
    postMessage({ type: "player.trace.all", body: data });
  });

  socket.on("game.end", () => {
    postMessage({ type: "game.end" });
  });

  socket.on("items.all", (data) => {
    postMessage({ type: "items.all", body: data });
  });

  socket.on("item.new", (data) => {
    postMessage({ type: "item.new", body: data });
  });

  socket.on("item.destroy", (data) => {
    postMessage({ type: "item.destroy", body: data });
  });

  socket.on("server.info", (data) => {
    postMessage({ type: "server.info", body: data });
  });

  socket.on("player.info.all", (data) => {
    delete data[yourId];
    postMessage({ type: "player.info.all", body: data });
  });

  socket.on("game.on", (data) => {
    postMessage({ type: "game.on", body: data });
  });

  socket.on("player.info.joined", (data) => {
    // FIXME debugging only, remove one line
    data[yourId] && logger(`ERROR "player.info.joined" for myself`);
    postMessage({ type: "player.info.joined", body: data });
  });

  socket.on("player.info.left", (data) => {
    // FIXME debugging only, remove one line
    logger(`"player.info.left" ${JSON.stringify(data)}`);
    postMessage({ type: "player.info.left", body: data });
  });
}

onmessage = ({ data }) => {
  switch (data.type) {
    case "player.trace.change":
      socket.emit("player.trace.change", data.body);
      break;
    case "game.start":
      logger("game.start");
      socket.emit("game.start", data.body);
      break;
    case "close":
      logger("Socket closing");
      socket.close();
      break;
    case "items.collision":
      socket.emit("items.collision", data.body);
      break;
    case "init":
      const { wsURL, yourId, yourName } = data.body;
      init(wsURL, yourId, yourName);
      break;
    default:
      break;
  }
};

function logger(message) {
  postMessage({
    type: "log",
    body: `Comms Worker: ${JSON.stringify(message)}`,
  });
}
