FROM node:14 as builder
WORKDIR /app

# Install dependencies
COPY ./package.json ./yarn.lock ./
RUN yarn install

# Build
COPY ./tsconfig.json ./
COPY ./src ./src
RUN yarn run build

FROM node:14-alpine
WORKDIR /app

COPY ./package.json ./yarn.lock ./
RUN yarn install --production

COPY --from=builder /app/dist ./dist

CMD node dist/index.js
