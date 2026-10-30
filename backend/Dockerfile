FROM node:24-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# No package installation: HTTP, token verification and Firestore REST use Node built-ins.
COPY --chown=node:node package.json *.mjs ./
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
