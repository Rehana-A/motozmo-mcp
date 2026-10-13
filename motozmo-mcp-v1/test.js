#!/usr/bin/env node
// Smoke test: boots the server over stdio, lists tools, and calls each one.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["server.js"],
  cwd: new URL(".", import.meta.url).pathname,
  env: process.env, // inherit proxy vars etc.; the SDK otherwise whitelists env
});
const client = new Client({ name: "motozmo-test", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("TOOLS:", tools.tools.map((t) => t.name).join(", "));

for (const [name, args] of [
  ["list_topics", {}],
  ["list_latest", { limit: 3 }],
  ["search_guides", { query: "test motorcycle ground connection", limit: 3 }],
  ["get_guide", { slug_or_url: "how-to-test-motorcycle-ground-connection" }],
]) {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content[0].text;
  console.log(`\n=== ${name} (${text.length} chars) ===`);
  console.log(text.slice(0, 500));
}
await client.close();
console.log("\nSMOKE TEST PASSED");
