# FROM --platform=linux/amd64 node:19-slim AS builder

# WORKDIR /usr/src/web

# COPY package*.json ./

# RUN npm install
# # RUN npm ci --only=production

# COPY static/ ./static
# COPY src/ ./src
# COPY bundler/ ./bundler

# RUN npm run build

FROM --platform=linux/amd64 nginx:1.23-alpine-slim

# --from=builder
COPY dist/ /usr/share/nginx/html/

EXPOSE 80
