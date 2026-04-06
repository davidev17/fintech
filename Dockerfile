FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY src/ ./src/
COPY public/ ./public/

# Create uploads directory
RUN mkdir -p /app/uploads

# Non-root user (security best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S finbank -u 1001 && \
    chown -R finbank:nodejs /app

USER finbank

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]