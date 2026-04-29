import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { IBClient } from '../client.js';

/** Well-known IB market-data field codes (subset). */
const FIELD_DESCRIPTIONS: Record<string, string> = {
  '31': 'Last price',
  '84': 'Bid price',
  '85': 'Ask size',
  '86': 'Ask price',
  '87': 'Volume',
  '88': 'Bid size',
  '70': 'High',
  '71': 'Low',
  '7295': 'Open',
  '7296': 'Close (prior)',
  '55': 'Symbol',
  '7051': 'Company name',
  '6072': 'P/E ratio',
  '7067': 'EPS (TTM)',
  '7068': 'Market cap',
  '6509': 'Market data availability',
};

const DEFAULT_FIELDS = '31,84,86,85,88,70,71,87,7295,7296';

/**
 * Register market-data MCP tools on the server.
 */
export function registerMarketDataTools(server: McpServer, client: IBClient): void {
  // -------------------------------------------------------------------------
  // get_market_data_snapshot – real-time / delayed quote snapshot
  // -------------------------------------------------------------------------
  server.tool(
    'get_market_data_snapshot',
    [
      'Get a real-time (or delayed) market data snapshot for one or more contracts.',
      'Returns price, size, OHLCV data and other fields.',
      `Available field codes: ${Object.entries(FIELD_DESCRIPTIONS)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}.`,
    ].join(' '),
    {
      conids: z
        .string()
        .describe(
          'Comma-separated list of IB contract IDs (e.g. "265598,8314"). Use search_securities to find contract IDs.',
        ),
      fields: z
        .string()
        .optional()
        .describe(
          `Comma-separated list of field codes to return. Defaults to "${DEFAULT_FIELDS}" (last, bid, ask, volume, OHLC).`,
        ),
    },
    async ({ conids, fields = DEFAULT_FIELDS }) => {
      const snapshot = await client.getMarketDataSnapshot(conids, fields);
      return {
        content: [{ type: 'text', text: JSON.stringify(snapshot, null, 2) }],
      };
    },
  );

  // -------------------------------------------------------------------------
  // search_securities – find a contract by symbol / name
  // -------------------------------------------------------------------------
  server.tool(
    'search_securities',
    'Search for IB contracts (stocks, ETFs, options, futures, etc.) by symbol or company name.',
    {
      symbol: z.string().describe('Ticker symbol or partial company name to search for'),
      secType: z
        .enum(['STK', 'OPT', 'FUT', 'CASH', 'CFD', 'IND', 'BOND', 'WAR', 'SRG', 'FND', 'BAG', 'CRYPTO'])
        .optional()
        .describe('Security type filter (e.g. "STK" for stocks, "OPT" for options)'),
      name: z
        .boolean()
        .optional()
        .describe('Set to true to search by company name instead of ticker symbol'),
    },
    async ({ symbol, secType, name }) => {
      const results = await client.searchSecurities(symbol, secType, name);
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    },
  );

  // -------------------------------------------------------------------------
  // get_contract_info – detailed contract spec
  // -------------------------------------------------------------------------
  server.tool(
    'get_contract_info',
    'Get detailed contract information (exchange, currency, multiplier, etc.) for a given contract ID.',
    {
      conid: z.string().describe('IB contract ID'),
    },
    async ({ conid }) => {
      const info = await client.getContractInfo(conid);
      return {
        content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
      };
    },
  );
}
