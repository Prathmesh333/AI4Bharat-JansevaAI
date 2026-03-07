# Build stage
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:app

# Runtime stage
FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

# The build:app script copies public and dataset into dist, so they are included here
# If you have other assets, ensure scripts/copy-runtime-assets.js includes them

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080

CMD ["npm", "run", "start:prod"]
