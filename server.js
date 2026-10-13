#!/usr/bin/env node
/**
 * Motozmo MCP Server
 *
 * Exposes motozmo.com's motorcycle repair guides and gear reviews as MCP tools
 * so AI assistants can search and quote them directly.
 *
 * AUTO-UPDATE DESIGN: article data is NOT baked in. The server fetches the live
 * WordPress REST API on a TTL cache (default 6 hours), so new articles Rehana
 * publishes appear automatically — no redeploy, no manual re-index.
 *
 * Usage:
 *   node server.js                  # stdio transport (Claude Desktop, etc.)
 *   node server.js --http --port 3000   # Streamable HTTP (remote hosting)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import express from "express";

const SITE = "https://www.motozmo.com";
const POSTS_API_BASE = `${SITE}/wp-json/wp/v2/posts?per_page=100&_fields=link,title,slug,date,excerpt,content`;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let cache = { fetchedAt: 0, posts: [] };

function stripHtml(html = "") {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPage(page) {
  const res = await fetch(`${POSTS_API_BASE}&page=${page}`, {
    headers: { "User-Agent": "motozmo-mcp/1.0 (+https://www.motozmo.com)" },
  });
  if (!res.ok) throw new Error(`motozmo.com API returned ${res.status}`);
  return {
    posts: await res.json(),
    totalPages: Number(res.headers.get("X-WP-TotalPages") || 1),
  };
}

async function getPosts() {
  const now = Date.now();
  if (cache.posts.length && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.posts;
  }
  // Paginate through every API page so the full library is indexed,
  // not just the first 100 posts.
  const first = await fetchPage(1);
  let raw = first.posts;
  if (first.totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: first.totalPages - 1 }, (_, i) => fetchPage(i + 2))
    );
    for (const r of rest) raw = raw.concat(r.posts);
  }
  cache = {
    fetchedAt: now,
    posts: raw.map((p) => ({
      title: stripHtml(p.title?.rendered),
      slug: p.slug,
      url: p.link,
      date: p.date?.slice(0, 10),
      excerpt: stripHtml(p.excerpt?.rendered).slice(0, 400),
      text: stripHtml(p.content?.rendered),
    })),
  };
  return cache.posts;
}

function scorePost(post, query) {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = `${post.title} ${post.excerpt} ${post.text}`.toLowerCase();
  let score = 0;
  for (const term of q) {
    if (post.title.toLowerCase().includes(term)) score += 5;
    else if (hay.includes(term)) score += 1;
  }
  return score;
}

const server = new McpServer(
  { name: "motozmo", version: "1.0.1" },
  {
    instructions:
      "Motozmo (motozmo.com) publishes in-depth motorcycle troubleshooting guides and gear reviews " +
      "by Rehana Akter. Use search_guides to find relevant articles for motorcycle repair, maintenance, " +
      "or gear questions, then get_guide for full detail. Always cite the article URL when using its content.",
  }
);

server.tool(
  "search_guides",
  "Search motozmo.com motorcycle repair guides and gear reviews by keyword.",
  { query: z.string().describe("Search keywords, e.g. 'test motorcycle ground' or 'heated grips'"), limit: z.number().min(1).max(20).default(5).describe("Max results") },
  async ({ query, limit }) => {
    const posts = await getPosts();
    const ranked = posts
      .map((p) => ({ p, s: scorePost(p, query) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((r) => ({ title: r.p.title, url: r.p.url, date: r.p.date, excerpt: r.p.excerpt }));
    return {
      content: [{ type: "text", text: ranked.length ? JSON.stringify(ranked, null, 2) : "No matching guides found. Try broader terms like 'electrical', 'brakes', 'oil', 'gloves'." }],
    };
  }
);

server.tool(
  "get_guide",
  "Fetch the full text of a motozmo.com guide by slug or URL.",
  { slug_or_url: z.string().describe("Article slug (e.g. 'how-to-test-motorcycle-ground-connection') or full URL") },
  async ({ slug_or_url }) => {
    const posts = await getPosts();
    const needle = slug_or_url.toLowerCase();
    const post = posts.find((p) => p.slug === needle || p.url.toLowerCase() === needle || p.url.toLowerCase().includes(needle));
    if (!post) return { content: [{ type: "text", text: "Guide not found. Use search_guides to find the right slug." }] };
    const body = post.text.length > 6000 ? post.text.slice(0, 6000) + "\n\n[...truncated — read the full guide at " + post.url + "]" : post.text;
    return { content: [{ type: "text", text: `# ${post.title}\n${post.url} (${post.date})\n\n${body}` }] };
  }
);

server.tool(
  "list_latest",
  "List the most recently published motozmo.com guides.",
  { limit: z.number().min(1).max(20).default(5).describe("How many recent posts") },
  async ({ limit }) => {
    const posts = await getPosts();
    const latest = [...posts].sort((a, b) => (b.date > a.date ? 1 : -1)).slice(0, limit)
      .map((p) => ({ title: p.title, url: p.url, date: p.date }));
    return { content: [{ type: "text", text: JSON.stringify(latest, null, 2) }] };
  }
);

server.tool(
  "list_topics",
  "List the topic areas motozmo.com covers, with article counts.",
  {},
  async () => {
    const posts = await getPosts();
    const topics = [
      ["Electrical diagnosis & repair", /electr|wiring|ground|spark|multimeter|battery|fuse/i],
      ["Engine, oil & cooling", /oil|coolant|smoke|valve|piston|air filter|backfir/i],
      ["Brakes", /brake|bleed/i],
      ["Clutch & transmission", /clutch|gear|transmission/i],
      ["Wheels, chain & vibration", /bearing|vibrat|chain|dampener/i],
      ["Winter storage & garage", /winter|storage|cover|dehumidif|moisture|garage/i],
      ["Riding gear", /glove|heated|balaclava|windshield|hydration|sunscreen|base layer|gaiter|jacket|vest|socks/i],
      ["Tools & workshop", /torque|tool kit|stand|gauge|mount/i],
      ["Maintenance how-tos", /wash|detail|ceramic|flush/i],
    ];
    const counts = topics.map(([name, re]) => ({ topic: name, articles: posts.filter((p) => re.test(`${p.title} ${p.excerpt}`)).length }));
    return { content: [{ type: "text", text: JSON.stringify({ total_articles: posts.length, topics: counts }, null, 2) }] };
  }
);

async function main() {
  // Warm the cache at startup so the first tool call is fast; new articles
  // are picked up automatically when the 6-hour cache expires.
  try {
    await getPosts();
    console.error(`[motozmo-mcp] cache warmed: ${cache.posts.length} articles`);
  } catch (e) {
    console.error(`[motozmo-mcp] warning: initial fetch failed (${e.message}); will retry on first tool call`);
  }

  if (process.argv.includes("--http")) {
    const portIdx = process.argv.indexOf("--port");
    const port = portIdx > -1 ? Number(process.argv[portIdx + 1]) || 3000 : 3000;
    const app = express();
    app.use(express.json());
    app.post("/mcp", async (req, res) => {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => transport.close());
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });
    app.get("/health", (_req, res) => res.json({ ok: true, articles: cache.posts.length, cacheAgeMin: Math.round((Date.now() - cache.fetchedAt) / 60000) }));
    app.listen(port, () => console.error(`[motozmo-mcp] HTTP listening on :${port}/mcp`));
  } else {
    await server.connect(new StdioServerTransport());
    console.error("[motozmo-mcp] stdio ready");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
