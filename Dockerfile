# Build stage
# Node runs the toolchain (vue-tsc needs it); bun installs from bun.lock
FROM node:22-alpine AS build
RUN npm install -g bun
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# "/" = talk to Ollama through this container's /api proxy (same origin, no CORS setup needed)
ARG VITE_OLLAMA_URL=/
ENV VITE_OLLAMA_URL=$VITE_OLLAMA_URL
RUN bun run build

# Runtime stage
FROM nginx:stable-alpine
# Where nginx forwards /api. Override with -e OLLAMA_URL=http://my-gpu-box:11434
ENV OLLAMA_URL=http://host.docker.internal:11434
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
