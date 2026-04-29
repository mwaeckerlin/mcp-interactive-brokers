#!/usr/bin/env node
/**
 * MCP Interactive Brokers Server
 *
 * This MCP server acts as a secure proxy to the Interactive Brokers Client Portal API.
 * The server handles authentication to the IB gateway, so sandboxed AI agents never
 * need direct access to IB credentials.
 *
 * Transport: stdio (default) or SSE.
 *
 * Environment variables:
 *   IB_GATEWAY_URL                       – URL of the local IB Client Portal Gateway
 *                                          (default: https://localhost:5000)
 *   IB_GATEWAY_TLS_REJECT_UNAUTHORIZED   – set to "false" to skip TLS verification
 *                                          (required for the gateway's self-signed cert)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createIBClientFromEnv } from './client.js';
import { registerAccountTools } from './tools/accounts.js';
import { registerPositionTools } from './tools/positions.js';
import { registerOrderTools } from './tools/orders.js';
import { registerMarketDataTools } from './tools/market-data.js';
import { registerHistoricalTools } from './tools/historical.js';

async function main(): Promise<void> {
  const client = createIBClientFromEnv();

  const server = new McpServer({
    name: 'mcp-interactive-brokers',
    version: '1.0.0',
  });

  // Register all tool families
  registerAccountTools(server, client);
  registerPositionTools(server, client);
  registerOrderTools(server, client);
  registerMarketDataTools(server, client);
  registerHistoricalTools(server, client);

  // Start the server using stdio transport (MCP standard)
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal error: ${message}\n`);
  process.exit(1);
});
