FROM node:20-alpine

# Install shared dependencies
WORKDIR /usr/src/app/services/shared
COPY services/shared .
RUN npm install --production

# Setup service
WORKDIR /usr/src/app/services/order-service
COPY services/order-service .
RUN npm install --production

EXPOSE 3002

CMD ["node", "index.js"]
