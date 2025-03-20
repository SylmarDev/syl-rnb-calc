FROM node:12

# Set up the main working directory
WORKDIR /usr/src/app
COPY . .

# Install root dependencies
RUN npm install

# Install dependencies for the 'calc' module separately
WORKDIR /usr/src/app/calc
RUN npm install

# Return to the root directory
WORKDIR /usr/src/app

# Build the project (if needed)
RUN node build || true

# Expose the app's port
EXPOSE 3000

# Run the server
CMD [ "node", "server.js" ]
