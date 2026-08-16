FROM node:20-slim
# Need build tools for native modules (node-hid, serialport)
RUN apt-get update && apt-get install -y python3 make g++ libudev-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5002
CMD ["node", "dist/index.js"]
