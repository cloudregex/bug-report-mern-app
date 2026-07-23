FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package descriptors
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy the rest of the application source code
COPY . .

# Ensure the uploads directory exists
RUN mkdir -p uploads

# Expose backend port
EXPOSE 5001

# Start the server
CMD ["npm", "start"]
