FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY --chown=nginx:nginx . /usr/share/nginx/html

EXPOSE 8080
