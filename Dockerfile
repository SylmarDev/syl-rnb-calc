FROM node:12

# Set the working directory
WORKDIR /usr/src/app

# Copy and install root dependencies
COPY package*.json ./
RUN npm install

# Set up the 'calc' directory separately
WORKDIR /usr/src/app/calc
COPY calc/package*.json ./
RUN npm install

# Copy the entire repo
WORKDIR /usr/src/app
COPY . .

# Build the project
RUN node build

# Expose the app's port
EXPOSE 3000

# Ensure the command runs from the correct directory
WORKDIR /usr/src/app
CMD [ "node", "server.js" ]
