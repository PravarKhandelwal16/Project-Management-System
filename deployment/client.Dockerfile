FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci
COPY shared ./shared
COPY client ./client
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN cd client && npm run build
FROM nginx:stable-alpine
COPY deployment/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
