# Stage 1: Builder
FROM node:16-alpine AS builder
WORKDIR /usr/src/app
RUN apk add --no-cache curl
COPY package*.json ./
RUN npm install
COPY . .

# Stage 2: Runner
FROM node:16-alpine
WORKDIR /usr/src/app
RUN apk add --no-cache curl
COPY --from=builder /usr/src/app ./
EXPOSE 3000
CMD ["node", "app.js"]
