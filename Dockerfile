FROM node:22-alpine

LABEL org.opencontainers.image.title="b2b-hiring-intent-mcp" \
      org.opencontainers.image.description="Zero-dependency MCP Server (v1.6.1) for B2B Hiring Intent, 125+ Tech-Stack Signals & Disclosed Salaries across 10 Global ATS platforms (Workday, Greenhouse, Lever, Ashby, Personio, Teamtailor, SmartRecruiters, Workable, Recruitee, Pinpoint) + 18 Cloud PPE APIs." \
      org.opencontainers.image.source="https://github.com/yan0lovesha/hiring-intent-mcp" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app
ENV NODE_ENV=production

COPY package.json LICENSE README.md server.json glama.json ./
COPY bin ./bin

RUN chmod +x /app/bin/b2b-hiring-intent-mcp.mjs && chown -R node:node /app

USER node
ENTRYPOINT ["node", "/app/bin/b2b-hiring-intent-mcp.mjs"]
