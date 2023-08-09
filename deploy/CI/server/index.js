import {createServer} from 'http';
import {Server} from 'socket.io';
import pino from 'pino';

const logger = pino();
const port = process.env.PORT | 3000;
const CORS_URL = process.env.CORS_URL || '*';

const broadcastRefreshUpdate = 50;

const httpServer = createServer();

let players = {};

const io = new Server(httpServer, {
  cors: {
    origin: CORS_URL,
  },
  // transports: ['websocket'],
  serveClient: false,
});

io.on('connection', (socket) => {
  Object.keys(players).forEach((id) => {
    socket.emit('player.new', {id, name: players[id].name});
  });

  socket.on('player.trace', (player) => {
    const {id, ...others} = player;
    if (!players[id]) {
      io.emit('player.new', {id, name: others.name});
    }
    players[id] = {...others, updated: new Date()};
  });
});

// broadcast all players data
setInterval(() => {
  io.emit('allPlayers', players);
}, broadcastRefreshUpdate);

// Clean stale players, and send delete player if stale
setInterval(() => {
  const now = new Date();
  const elapsedTimesById = Object.entries(players).map((e) => ({
    id: e[0],
    elapsed: now - e[1].updated,
  }));
  const staleIds = elapsedTimesById.filter((e) => e.elapsed > 250);
  staleIds.forEach((p) => {
    logger.info(`Stale player ${p.id} by ${p.elapsed}ms`);
    io.emit('player.delete', p.id);
    players[p.id] = undefined;
    delete players[p.id];
  });
}, 2000);

setInterval(() => logger.info(`${Object.keys(players).length} active players`), 5000);

httpServer.listen(port, () => logger.info(`Server listening to port ${port}`));