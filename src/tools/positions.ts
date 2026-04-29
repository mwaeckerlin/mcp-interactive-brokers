import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { IBClient } from '../client.js';

/**
 * Register position-related MCP tools on the server.
 */
export function registerPositionTools(server: McpServer, client: IBClient): void {
  // -------------------------------------------------------------------------
  // get_positions – portfolio positions for an account
  // -------------------------------------------------------------------------
  server.tool(
    'get_positions',
    'Get all open positions (holdings) for a specific account.',
    {
      accountId: z.string().describe('The IB account ID (e.g. "U1234567")'),
      page: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Page number (0-based) for paginated results. Defaults to 0.'),
    },
    async ({ accountId, page = 0 }) => {
      const positions = await client.getPositions(accountId, page);
      return {
        content: [{ type: 'text', text: JSON.stringify(positions, null, 2) }],
      };
    },
  );

  // -------------------------------------------------------------------------
  // invalidate_positions_cache – force a fresh fetch next time
  // -------------------------------------------------------------------------
  server.tool(
    'invalidate_positions_cache',
    'Invalidate the IB position cache so the next get_positions call returns fresh data.',
    {
      accountId: z.string().describe('The IB account ID (e.g. "U1234567")'),
    },
    async ({ accountId }) => {
      const result = await client.invalidatePositionsCache(accountId);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
