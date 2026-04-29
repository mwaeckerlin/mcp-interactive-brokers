import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { IBClient } from '../client.js';

/**
 * Register account-related MCP tools on the server.
 */
export function registerAccountTools(server: McpServer, client: IBClient): void {
  // -------------------------------------------------------------------------
  // auth_status – check whether the IB gateway session is authenticated
  // -------------------------------------------------------------------------
  server.tool(
    'auth_status',
    'Check the current IB Gateway authentication / session status.',
    {},
    async () => {
      const status = await client.getAuthStatus();
      return {
        content: [{ type: 'text', text: JSON.stringify(status, null, 2) }],
      };
    },
  );

  // -------------------------------------------------------------------------
  // reauthenticate – trigger a re-authentication
  // -------------------------------------------------------------------------
  server.tool(
    'reauthenticate',
    'Re-authenticate the IB Gateway session. Use this when the session has expired.',
    {},
    async () => {
      const status = await client.reauthenticate();
      return {
        content: [{ type: 'text', text: JSON.stringify(status, null, 2) }],
      };
    },
  );

  // -------------------------------------------------------------------------
  // list_accounts – list all accounts
  // -------------------------------------------------------------------------
  server.tool(
    'list_accounts',
    'List all IB accounts accessible to the authenticated user.',
    {},
    async () => {
      const accounts = await client.getAccounts();
      return {
        content: [{ type: 'text', text: JSON.stringify(accounts, null, 2) }],
      };
    },
  );

  // -------------------------------------------------------------------------
  // get_account_summary – balances and margin info
  // -------------------------------------------------------------------------
  server.tool(
    'get_account_summary',
    'Get account summary (balances, buying power, margin, net liquidation value, etc.) for a specific account.',
    {
      accountId: z.string().describe('The IB account ID (e.g. "U1234567")'),
    },
    async ({ accountId }) => {
      const summary = await client.getAccountSummary(accountId);
      return {
        content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
      };
    },
  );

  // -------------------------------------------------------------------------
  // get_account_ledger – portfolio ledger / P&L
  // -------------------------------------------------------------------------
  server.tool(
    'get_account_ledger',
    'Get portfolio ledger (P&L, cash balances by currency) for a specific account.',
    {
      accountId: z.string().describe('The IB account ID (e.g. "U1234567")'),
    },
    async ({ accountId }) => {
      const ledger = await client.getAccountLedger(accountId);
      return {
        content: [{ type: 'text', text: JSON.stringify(ledger, null, 2) }],
      };
    },
  );
}
