import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { IBClient } from '../client.js';

/**
 * Register historical-data MCP tools on the server.
 */
export function registerHistoricalTools(server: McpServer, client: IBClient): void {
  // -------------------------------------------------------------------------
  // get_historical_data – OHLCV bars for a contract
  // -------------------------------------------------------------------------
  server.tool(
    'get_historical_data',
    [
      'Get historical OHLCV (Open/High/Low/Close/Volume) bars for a contract.',
      'Period examples: "1d", "1w", "1m", "3m", "6m", "1y", "2y", "5y".',
      'Bar size examples: "1min", "2min", "3min", "5min", "10min", "15min", "30min", "1h", "2h", "3h", "4h", "8h", "1d", "1w", "1m".',
    ].join(' '),
    {
      conid: z
        .string()
        .describe('IB contract ID. Use search_securities to find the contract ID for a ticker symbol.'),
      period: z
        .string()
        .describe(
          'Time period to fetch. Examples: "1d" (1 day), "1w" (1 week), "1m" (1 month), "3m", "6m", "1y".',
        ),
      bar: z
        .string()
        .describe(
          'Bar (candle) size. Examples: "1min", "5min", "15min", "30min", "1h", "1d", "1w".',
        ),
      outsideRth: z
        .boolean()
        .optional()
        .describe(
          'Include data from outside regular trading hours (pre-market / after-hours). Defaults to false.',
        ),
    },
    async ({ conid, period, bar, outsideRth = false }) => {
      const data = await client.getHistoricalData(conid, period, bar, outsideRth);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
