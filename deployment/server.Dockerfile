FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev
COPY shared ./shared
COPY database ./database
COPY server ./server
ENV NODE_ENV=production
USER node
WORKDIR /app/server
EXPOSE 5000
CMD ["node","server.js"]
