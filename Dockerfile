FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm ci
COPY build.js ./
COPY js ./js
COPY assets ./assets
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --chown=nginx:nginx index.html /usr/share/nginx/html/index.html
COPY --chown=nginx:nginx css /usr/share/nginx/html/css
COPY --chown=nginx:nginx sw.js /usr/share/nginx/html/sw.js
COPY --chown=nginx:nginx manifest.webmanifest /usr/share/nginx/html/manifest.webmanifest
COPY --chown=nginx:nginx --from=build /build/dist /usr/share/nginx/html/dist

EXPOSE 8080
