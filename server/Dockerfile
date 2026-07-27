FROM node:22-alpine

# No npm dependencies — node:http + node:sqlite (built in) only — so there's
# nothing to install and no native build step to go wrong in a container.
WORKDIR /app
COPY package.json db.js index.js ./

RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

ENV DB_PATH=/app/data/sync.db
EXPOSE 8081

CMD ["node", "index.js"]
