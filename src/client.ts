import https from 'https';
import {
  IBGatewayConfig,
  AuthStatus,
  Account,
  AccountSummary,
  Position,
  Order,
  PlaceOrderRequest,
  PlaceOrderResponse,
  MarketDataSnapshot,
  HistoricalData,
  ContractInfo,
  SecuritySearchResult,
} from './types.js';

/**
 * Minimal fetch-compatible interface used by IBClient.
 * Abstracted so that tests can inject a mock without needing to deal
 * with ESM-only libraries.
 */
export interface FetchResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export type FetchFn = (
  url: string,
  options: Record<string, unknown>,
) => Promise<FetchResponse>;

/**
 * Build the default fetch function backed by node-fetch (ESM).
 * The function is created once and captures the HTTPS agent so
 * tests can replace it by injecting their own FetchFn.
 */
function buildDefaultFetch(agent: https.Agent): FetchFn {
  return async (url, options) => {
    // node-fetch v3 is ESM-only; dynamic import keeps the CJS wrapper happy.
    const { default: fetch } = await import('node-fetch');
    return fetch(url, { ...options, agent } as Parameters<typeof fetch>[1]) as Promise<FetchResponse>;
  };
}

/**
 * Client for the Interactive Brokers Client Portal REST API.
 *
 * The IB Client Portal Gateway runs locally (or in a Docker container)
 * and exposes a REST API that this client talks to. The gateway handles
 * the actual authentication handshake with IB servers, so the MCP server
 * only needs to forward requests – keeping IB credentials out of the
 * hands of sandboxed agents.
 */
export class IBClient {
  private readonly config: IBGatewayConfig;
  private readonly fetchFn: FetchFn;

  constructor(config: IBGatewayConfig, fetchFn?: FetchFn) {
    this.config = config;
    if (fetchFn) {
      this.fetchFn = fetchFn;
    } else {
      const agent = new https.Agent({ rejectUnauthorized: config.rejectUnauthorized });
      this.fetchFn = buildDefaultFetch(agent);
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private buildUrl(path: string): string {
    const base = this.config.gatewayUrl.replace(/\/$/, '');
    return `${base}${path}`;
  }

  /**
   * Make an HTTP request to the IB gateway.
   */
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = this.buildUrl(path);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const options: Record<string, unknown> = { method, headers };

    if (body !== undefined) {
      options['body'] = JSON.stringify(body);
    }

    const response = await this.fetchFn(url, options);

    if (!response.ok) {
      let errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText) as { error?: string; message?: string };
        errorText = errorJson.error ?? errorJson.message ?? errorText;
      } catch {
        // keep raw text
      }
      throw new Error(`IB Gateway error ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    if (!text) return undefined as unknown as T;
    return JSON.parse(text) as T;
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  /** Get the current authentication / session status. */
  async getAuthStatus(): Promise<AuthStatus> {
    return this.get<AuthStatus>('/v1/api/iserver/auth/status');
  }

  /** Re-authenticate the gateway session. */
  async reauthenticate(): Promise<AuthStatus> {
    return this.post<AuthStatus>('/v1/api/iserver/reauthenticate');
  }

  /** Keep the session alive (call periodically to avoid timeouts). */
  async tickle(): Promise<{ session: string; hmds?: { error?: string }; iserver?: { authStatus?: AuthStatus } }> {
    return this.post('/v1/api/tickle');
  }

  /** Log out. */
  async logout(): Promise<{ status: boolean }> {
    return this.post('/v1/api/logout');
  }

  // ---------------------------------------------------------------------------
  // Accounts
  // ---------------------------------------------------------------------------

  /** List all accounts accessible to the authenticated user. */
  async getAccounts(): Promise<Account[]> {
    return this.get<Account[]>('/v1/api/portfolio/accounts');
  }

  /** Get summary (balances) for the given account. */
  async getAccountSummary(accountId: string): Promise<AccountSummary> {
    return this.get<AccountSummary>(`/v1/api/portfolio/${accountId}/summary`);
  }

  /** Get portfolio meta-data / ledger for the given account. */
  async getAccountLedger(accountId: string): Promise<Record<string, unknown>> {
    return this.get(`/v1/api/portfolio/${accountId}/ledger`);
  }

  // ---------------------------------------------------------------------------
  // Positions
  // ---------------------------------------------------------------------------

  /** Get all positions for an account (paginated; page starts at 0). */
  async getPositions(accountId: string, page = 0): Promise<Position[]> {
    return this.get<Position[]>(`/v1/api/portfolio/${accountId}/positions/${page}`);
  }

  /** Invalidate the position cache so the next fetch is fresh. */
  async invalidatePositionsCache(accountId: string): Promise<{ message: string }> {
    return this.post(`/v1/api/portfolio/${accountId}/positions/invalidate`);
  }

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------

  /** Get live orders for the authenticated user. */
  async getLiveOrders(): Promise<{ orders: Order[]; snapshot: boolean }> {
    return this.get('/v1/api/iserver/account/orders');
  }

  /** Place one or more orders for the given account. */
  async placeOrder(accountId: string, orders: PlaceOrderRequest[]): Promise<PlaceOrderResponse[]> {
    return this.post<PlaceOrderResponse[]>(`/v1/api/iserver/account/${accountId}/orders`, { orders });
  }

  /** Modify an existing order. */
  async modifyOrder(
    accountId: string,
    orderId: string,
    update: Partial<PlaceOrderRequest>,
  ): Promise<PlaceOrderResponse[]> {
    return this.post<PlaceOrderResponse[]>(
      `/v1/api/iserver/account/${accountId}/order/${orderId}`,
      update,
    );
  }

  /** Cancel an order. */
  async cancelOrder(accountId: string, orderId: string): Promise<{ msg: string; order_id: number; conid: number; account: string; error?: string }> {
    return this.delete(`/v1/api/iserver/account/${accountId}/order/${orderId}`);
  }

  /** Confirm a pending order (reply to an order warning message). */
  async confirmOrder(replyId: string, confirmed: boolean): Promise<PlaceOrderResponse[]> {
    return this.post<PlaceOrderResponse[]>(`/v1/api/iserver/reply/${replyId}`, { confirmed });
  }

  // ---------------------------------------------------------------------------
  // Market data
  // ---------------------------------------------------------------------------

  /**
   * Get a snapshot of market data for one or more contracts.
   * @param conids  Comma-separated list of contract IDs.
   * @param fields  Comma-separated list of field codes to return.
   */
  async getMarketDataSnapshot(conids: string, fields: string): Promise<MarketDataSnapshot[]> {
    return this.get<MarketDataSnapshot[]>(
      `/v1/api/iserver/marketdata/snapshot?conids=${conids}&fields=${fields}`,
    );
  }

  /**
   * Unsubscribe from market data for a contract.
   */
  async unsubscribeMarketData(conid: string): Promise<{ message?: string }> {
    return this.delete(`/v1/api/iserver/marketdata/${conid}/unsubscribe`);
  }

  // ---------------------------------------------------------------------------
  // Historical data
  // ---------------------------------------------------------------------------

  /**
   * Get OHLCV bars for a contract.
   * @param conid  Contract ID.
   * @param period  Period string e.g. "1d", "1w", "1m", "1y".
   * @param bar     Bar size e.g. "1min", "5min", "1h", "1d".
   * @param outsideRth  Include outside regular trading hours.
   */
  async getHistoricalData(
    conid: string,
    period: string,
    bar: string,
    outsideRth = false,
  ): Promise<HistoricalData> {
    return this.get<HistoricalData>(
      `/v1/api/iserver/marketdata/history?conid=${conid}&period=${period}&bar=${bar}&outsideRth=${outsideRth}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Contract / instrument search
  // ---------------------------------------------------------------------------

  /** Search for instruments by symbol or name. */
  async searchSecurities(symbol: string, secType?: string, name = false): Promise<SecuritySearchResult[]> {
    return this.post<SecuritySearchResult[]>(`/v1/api/iserver/secdef/search`, { symbol, name, secType });
  }

  /** Get detailed contract information for a contract ID. */
  async getContractInfo(conid: string): Promise<ContractInfo[]> {
    return this.get<ContractInfo[]>(`/v1/api/iserver/contract/${conid}/info`);
  }
}

/**
 * Build an IBClient from environment variables.
 *
 * Required env vars:
 *   IB_GATEWAY_URL  – URL of the local IB Client Portal Gateway (default: https://localhost:5000)
 *
 * Optional:
 *   IB_GATEWAY_TLS_REJECT_UNAUTHORIZED – set to "false" to skip TLS verification (useful for
 *                                         the self-signed cert the gateway ships with).
 */
export function createIBClientFromEnv(): IBClient {
  const gatewayUrl = process.env['IB_GATEWAY_URL'] ?? 'https://localhost:5000';
  const rejectUnauthorized =
    (process.env['IB_GATEWAY_TLS_REJECT_UNAUTHORIZED'] ?? 'false').toLowerCase() !== 'false';

  return new IBClient({ gatewayUrl, rejectUnauthorized });
}
