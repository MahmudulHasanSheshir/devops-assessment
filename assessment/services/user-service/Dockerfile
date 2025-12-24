FROM node:20-alpine

# Install shared dependencies first (to handle symlink/resolution issues)
WORKDIR /usr/src/app/services/shared
COPY services/shared .
RUN npm install --production

# Setup service
WORKDIR /usr/src/app/services/user-service
COPY services/user-service .
RUN npm install --production

EXPOSE 3000

CMD ["node", "index.js"]
