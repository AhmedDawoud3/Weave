FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Start Vite dev server and expose it to the network
CMD ["npm", "run", "dev", "--", "--host"]
