# Use Puppeteer base image with Chromium preinstalled
FROM ghcr.io/puppeteer/puppeteer:latest

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Skip Chromium download & fix permissions
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NPM_CONFIG_UNSAFE_PERM=true

# Change ownership to avoid EACCES errors
USER root
RUN chown -R pptruser:pptruser /app

# Switch to non-root user
USER pptruser

# Install dependencies safely as non-root
RUN npm install

# Copy the rest of the app
COPY . .

# Expose port for Render.com
EXPOSE 10000

# Start the server
CMD ["node", "server.mjs"]
