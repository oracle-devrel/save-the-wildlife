FROM --platform=linux/amd64 node:20-slim

WORKDIR /usr/src/app

RUN mkdir config

RUN echo "PORT=3000" >> config/.env
RUN echo "BROADCAST_REFRESH_UPDATE=20" >> config/.env
RUN echo "GAME_DURATION_IN_SECONDS=180" >> config/.env
RUN echo "ENABLE_COHERENCE_BACKEND=true" >> config/.env
RUN echo "ENABLE_REDIS_BACKEND=false" >> config/.env
RUN echo "REDIS_SERVICE_HOST=localhost" >> config/.env
RUN echo "REDIS_SERVICE_PORT=6379" >> config/.env
RUN echo "REDIS_PASSWORD=fk3ampeHq" >> config/.env
RUN echo "SCORE_SERVICE_HOST=localhost" >> config/.env
RUN echo "SCORE_SERVICE_PORT=8080" >> config/.env
RUN echo "WORLD_SIZE_Z=155" >> config/.env
RUN echo "WORLD_SIZE_X=250" >> config/.env

COPY package*.json ./

RUN npm install
# RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD [ "node", "index.js" ]
