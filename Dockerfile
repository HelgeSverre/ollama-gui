# Build stage
FROM node:20-alpine as build-stage
WORKDIR /app

# Copy package.json and yarn.lock to install dependencies
COPY package.json ./
COPY yarn.lock ./

RUN yarn install

# Copy the rest of the files
COPY . .

# Build the app
RUN yarn run build

# Production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
