# Motozmo MCP — Directory Submission Kit

Everything below is ready to paste. Steps marked 🔑 need Rehana's GitHub login
(a few clicks each) — they can't be done without her account.

## Canonical metadata (use everywhere)

- **Name:** Motozmo — Motorcycle Repair Guides
- **Registry name:** `io.github/rehanaakter/motozmo`
- **Tagline:** Search 50+ motorcycle repair guides and gear reviews from motozmo.com
- **Category:** Lifestyle / Reference / Automotive
- **Install (local):** `npx -y motozmo-mcp`
- **Remote endpoint:** (fill in after hosting, e.g. `https://motozmo-mcp.onrender.com/mcp`)
- **Repo:** https://github.com/rehanaakter/motozmo-mcp *(create first — see below)*
- **Website:** https://www.motozmo.com
- **Description (long):** Motozmo MCP gives AI assistants direct access to motozmo.com's
  library of in-depth motorcycle troubleshooting guides and gear reviews: electrical
  diagnosis (including the voltage-drop ground test most guides skip), engine and oil
  troubleshooting, brakes, clutch/transmission, winter storage, and riding gear.
  Four tools: search_guides, get_guide, list_latest, list_topics. The article index
  refreshes automatically from the site's WordPress API every 6 hours, so new guides
  appear without redeploying.

## Order of operations

1. 🔑 Create GitHub repo `rehanaakter/motozmo-mcp`, push this folder.
2. `npm publish` (needs an npm account — free; can be Rehana's).
3. 🔑 Official MCP registry: `mcp-publisher init && mcp-publisher login github && mcp-publisher publish`
   (uses `server.json` in this folder).
4. 🔑 **Smithery** — https://smithery.ai → Submit Server → paste repo URL.
5. 🔑 **mcp.so** — https://mcp.so/submit → fill the form with metadata above.
6. 🔑 **Glama** — https://glama.ai/mcp/servers → auto-indexes the GitHub repo; claim the listing.
7. 🔑 **PulseMCP** — https://www.pulsemcp.com/submit → hand-reviewed, one paragraph description.
8. 🔑 **awesome-mcp-servers** — PR to https://github.com/punkpeye/awesome-mcp-servers adding one line under Reference/Lifestyle.
9. **mcpmarket.com**, **cursor.directory** — submit forms, same metadata.

## Skill publishing

- The skill lives in `skill/SKILL.md` (Agent Skills open format).
- Publish wherever skills are shared in your toolchain (e.g. team skill repo,
  Claude Code plugin marketplace). Directories for skills are still emerging —
  check current options before submitting.
