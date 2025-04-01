# Use official Puppeteer base image with Chromium already bundled
FROM ghcr.io/puppeteer/puppeteer:latest

# Set working directory
WORKDIR /app

# Copy only package files first to install dependencies
COPY package*.json ./

# Allow npm to run with root user
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NPM_CONFIG_UNSAFE_PERM=true

# Install dependencies
RUN npm install

# Copy the rest of your app
COPY . .

# Expose port (used in Railway)
EXPOSE 3000

# Start the app
CMD ["node", "server.mjs"]
