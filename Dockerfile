FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts --omit=dev
COPY --from=builder /app/dist ./dist

ENV IB_GATEWAY_URL=https://ib-gateway:5000
ENV IB_GATEWAY_TLS_REJECT_UNAUTHORIZED=false

USER node
ENTRYPOINT ["node", "dist/index.js"]
