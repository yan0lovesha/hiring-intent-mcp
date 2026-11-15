# Hiring Intent Autopilot MCP Server & CLI

Zero-dependency Model Context Protocol (`stdio` JSON-RPC 2.0) server and CLI for extracting structured engineering & SaaS tech-stack signals from public ATS feeds (Personio, Teamtailor, SmartRecruiters, Workable, Recruitee).

## Features
- **Local Zero-Dependency Mode**: Query public ATS endpoints directly from Claude Desktop, Cursor, or VS Code Copilot (`Node >= 20`).
- **Cloud Batch Mode**: Optional integration with [Apify Store PPE APIs](https://apify.com/yan0lovesha) for multi-company batch runs:
  - [Personio Jobs & Hiring Intent API](https://apify.com/yan0lovesha/personio-jobs-hiring-intent)
  - [Teamtailor Jobs & Hiring Signal API](https://apify.com/yan0lovesha/teamtailor-jobs-hiring-signal)
  - [SmartRecruiters Jobs & Hiring Intent API](https://apify.com/yan0lovesha/smartrecruiters-jobs-hiring-intent)
  - [Workable Jobs & Hiring Intent API](https://apify.com/yan0lovesha/workable-jobs-hiring-intent)
  - [Recruitee Jobs & Hiring Intent API](https://apify.com/yan0lovesha/recruitee-jobs-hiring-intent)
- **Pro Automation Kit**: Production 14-node `n8n` multi-ATS workflows, Clay.com waterfall templates, and interactive dashboards.

## Quickstart
```bash
node ./bin/hiring-intent-mcp.mjs --cli --platform personio --target adsquare --max 5
```

## License
MIT