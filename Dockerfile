# Use Puppeteer's recommended image
FROM ghcr.io/puppeteer/puppeteer:latest

# Set working directory
WORKDIR /app

# Copy your app files
COPY . .

# Install dependencies
RUN npm install

# Set Puppeteer to skip Chromium download since it's already bundled in the base image
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Expose port (optional if Railway auto-detects)
EXPOSE 3000

# Start server
CMD ["node", "server.mjs"]
