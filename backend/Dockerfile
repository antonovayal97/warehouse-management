FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
RUN mkdir -p uploads/warehouses
EXPOSE 5000
CMD ["node", "server.js"]
