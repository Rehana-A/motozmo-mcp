# Motozmo MCP Server

Exposes [motozmo.com](https://www.motozmo.com)'s motorcycle repair guides and gear reviews
as MCP tools, so AI assistants (Claude, Cursor, etc.) can search and quote them directly.

**Tools:** `search_guides` · `get_guide` · `list_latest` · `list_topics`

## Auto-updates: yes

Article data is **not** baked into the code. The server fetches the live WordPress
REST API (`/wp-json/wp/v2/posts`) and caches it for 6 hours. When Rehana publishes a
new article, it appears in tool results automatically after the cache refreshes —
no redeploy, no manual re-indexing.

## Run locally (stdio)

```bash
npm install
node server.js
```

Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "motozmo": { "command": "node", "args": ["/absolute/path/to/motozmo-mcp/server.js"] }
  }
}
```

## Host remotely (Streamable HTTP)

```bash
node server.js --http --port 3000   # serves POST /mcp, GET /health
```

Options, cheapest first:

1. **Render / Railway / Fly.io** — deploy this folder as a Node service
   (`npm install && node server.js --http --port $PORT`). Free tiers work for
   this workload (tiny traffic, 6h cache).
2. **Own VPS/shared hosting** — any host that runs persistent Node.js 18+.
3. **Cloudflare Workers** — needs a small adapter (workers-mcp); ask before going this route.

Remote servers are what MCP directories list and what other people's assistants can connect to.

## Publish for directories

```bash
npm publish          # then directories can reference it via npx -y motozmo-mcp
```

See `SUBMIT.md` for the per-directory submission checklist, and `server.json`
for the official MCP registry (`mcp-publisher publish`).

## Test

```bash
npm test   # boots over stdio, lists tools, calls each one against the live site
```
