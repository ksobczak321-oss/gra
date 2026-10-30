FROM node:24-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# No package installation: this infrastructure service only uses Node built-ins.
COPY --chown=node:node package.json server.mjs ./
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
