FROM node:22-alpine

LABEL org.opencontainers.image.title="b2b-hiring-intent-mcp" \
      org.opencontainers.image.description="Zero-dependency MCP Server for B2B Hiring Intent, Tech-Stack Signals & Disclosed Salaries across 9 ATS platforms (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Personio, Teamtailor, Pinpoint)." \
      org.opencontainers.image.source="https://github.com/yan0lovesha/hiring-intent-mcp" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app
ENV NODE_ENV=production

COPY package.json LICENSE README.md server.json glama.json ./
COPY bin ./bin

RUN chmod +x /app/bin/b2b-hiring-intent-mcp.mjs && chown -R node:node /app

USER node
ENTRYPOINT ["node", "/app/bin/b2b-hiring-intent-mcp.mjs"]
