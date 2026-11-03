# syntax=docker/dockerfile:1
# Use the latest stable Dockerfile frontend syntax (enables newer BuildKit features)

# ---- base: shared by dev and prod ----
# Small Node 20 image based on Alpine Linux
FROM node:20-alpine AS base
# All following instructions run from /app inside the container
WORKDIR /app
# Copy only the manifests first so the npm install layer is cached until dependencies change
COPY package*.json ./

# ---- development: all deps, hot reload (source is bind-mounted) ----
# Start a new stage from base for local development
FROM base AS development
# Run the app in development mode (enables Neon Local config in database.js)
ENV NODE_ENV=development
# Install exact lockfile versions, including devDependencies
RUN npm ci
# Copy the rest of the source (compose bind-mounts ./src over it for live reload)
COPY . .
# Document that the app listens on port 3000
EXPOSE 3000
# Start with `node --watch` so code changes restart the server
CMD ["npm", "run", "dev"]

# ---- production: prod deps only, non-root ----
# Start a new stage from base for the production image
FROM base AS production
# Run the app in production mode (uses Neon Cloud, enables bot detection, secure cookies)
ENV NODE_ENV=production
# Install exact lockfile versions without devDependencies, then drop the npm cache to shrink the image
RUN npm ci --omit=dev && npm cache clean --force
# Copy the application source
COPY . .
# Create the logs directory and give the unprivileged `node` user ownership of /app
RUN mkdir -p logs && chown -R node:node /app
# Drop root privileges for everything that follows, including the running app
USER node
# Document that the app listens on port 3000
EXPOSE 3000
# Start the server directly with Node (no file watcher in production)
CMD ["node", "src/index.js"]
