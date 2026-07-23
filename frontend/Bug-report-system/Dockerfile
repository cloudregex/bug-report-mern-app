# Build stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package descriptors and lockfile
COPY package*.json ./

# Install all dependencies including devDependencies (needed for building)
RUN npm install

# Copy application source code
COPY . .

# Injected environment variable for build time
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build the project
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy default nginx configuration for React SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts to nginx public folder
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Expose Nginx port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
