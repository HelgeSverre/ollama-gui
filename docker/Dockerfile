FROM node:21.6.0-alpine

WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install project dependencies
RUN yarn install

# Copy the rest of the project files to the working directory
COPY . .

RUN yarn build

# Expose the port that the application will run on
EXPOSE 8080

# Start the application
CMD ["yarn", "dev"]