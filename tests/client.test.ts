import { IBClient, FetchFn, FetchResponse, createIBClientFromEnv } from '../src/client';

// ---------------------------------------------------------------------------
// Helpers to create mock fetch responses
// ---------------------------------------------------------------------------

function makeResponse(body: unknown, status = 200): FetchResponse {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
  };
}

function makeErrorResponse(status: number, message: string): FetchResponse {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(JSON.stringify({ error: message })),
  };
}

function makeMockFetch(responses: FetchResponse[]): {
  fn: FetchFn;
  calls: Array<[string, Record<string, unknown>]>;
} {
  const calls: Array<[string, Record<string, unknown>]> = [];
  let idx = 0;
  const fn: FetchFn = (url, options) => {
    calls.push([url, options]);
    const resp = responses[idx++];
    if (!resp) throw new Error('No mock response available');
    return Promise.resolve(resp);
  };
  return { fn, calls };
}

function makeClient(responses: FetchResponse[]): {
  client: IBClient;
  calls: Array<[string, Record<string, unknown>]>;
} {
  const { fn, calls } = makeMockFetch(responses);
  const client = new IBClient(
    { gatewayUrl: 'https://localhost:5000', rejectUnauthorized: false },
    fn,
  );
  return { client, calls };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IBClient', () => {
  describe('getAuthStatus', () => {
    it('returns auth status on success', async () => {
      const mockStatus = { authenticated: true, competing: false, connected: true };
      const { client, calls } = makeClient([makeResponse(mockStatus)]);

      const result = await client.getAuthStatus();

      expect(result).toEqual(mockStatus);
      expect(calls[0]![0]).toBe('https://localhost:5000/v1/api/iserver/auth/status');
      expect(calls[0]![1]).toMatchObject({ method: 'GET' });
    });
  });

  describe('reauthenticate', () => {
    it('calls reauthenticate endpoint', async () => {
      const mockStatus = { authenticated: true, competing: false, connected: true };
      const { client, calls } = makeClient([makeResponse(mockStatus)]);

      const result = await client.reauthenticate();

      expect(result).toEqual(mockStatus);
      expect(calls[0]![0]).toBe('https://localhost:5000/v1/api/iserver/reauthenticate');
      expect(calls[0]![1]).toMatchObject({ method: 'POST' });
    });
  });

  describe('getAccounts', () => {
    it('returns list of accounts', async () => {
      const mockAccounts = [
        { id: 'U1234567', accountId: 'U1234567', currency: 'USD', type: 'INDIVIDUAL' },
      ];
      const { client, calls } = makeClient([makeResponse(mockAccounts)]);

      const result = await client.getAccounts();

      expect(result).toEqual(mockAccounts);
      expect(calls[0]![0]).toBe('https://localhost:5000/v1/api/portfolio/accounts');
      expect(calls[0]![1]).toMatchObject({ method: 'GET' });
    });
  });

  describe('getAccountSummary', () => {
    it('returns account summary for a given account ID', async () => {
      const mockSummary = {
        netliquidation: {
          amount: '100000',
          currency: 'USD',
          isNull: false,
          timestamp: 1234567890,
          value: '100000',
        },
      };
      const { client, calls } = makeClient([makeResponse(mockSummary)]);

      const result = await client.getAccountSummary('U1234567');

      expect(result).toEqual(mockSummary);
      expect(calls[0]![0]).toBe('https://localhost:5000/v1/api/portfolio/U1234567/summary');
    });
  });

  describe('getAccountLedger', () => {
    it('returns account ledger', async () => {
      const mockLedger = { BASE: { cashbalance: 50000, unrealizedpnl: 5000 } };
      const { client, calls } = makeClient([makeResponse(mockLedger)]);

      const result = await client.getAccountLedger('U1234567');

      expect(result).toEqual(mockLedger);
      expect(calls[0]![0]).toBe('https://localhost:5000/v1/api/portfolio/U1234567/ledger');
    });
  });

  describe('getPositions', () => {
    it('returns positions for a given account (page 0 by default)', async () => {
      const mockPositions = [
        {
          acctId: 'U1234567',
          conid: 265598,
          contractDesc: 'AAPL',
          position: 100,
          mktPrice: 175.0,
        },
      ];
      const { client, calls } = makeClient([makeResponse(mockPositions)]);

      const result = await client.getPositions('U1234567');

      expect(result).toEqual(mockPositions);
      expect(calls[0]![0]).toBe(
        'https://localhost:5000/v1/api/portfolio/U1234567/positions/0',
      );
    });

    it('uses specified page number', async () => {
      const { client, calls } = makeClient([makeResponse([])]);

      await client.getPositions('U1234567', 2);

      expect(calls[0]![0]).toBe(
        'https://localhost:5000/v1/api/portfolio/U1234567/positions/2',
      );
    });
  });

  describe('invalidatePositionsCache', () => {
    it('calls invalidate endpoint', async () => {
      const { client, calls } = makeClient([makeResponse({ message: 'done' })]);

      const result = await client.invalidatePositionsCache('U1234567');

      expect(result).toEqual({ message: 'done' });
      expect(calls[0]![0]).toBe(
        'https://localhost:5000/v1/api/portfolio/U1234567/positions/invalidate',
      );
      expect(calls[0]![1]).toMatchObject({ method: 'POST' });
    });
  });

  describe('getLiveOrders', () => {
    it('returns live orders', async () => {
      const mockOrders = { orders: [], snapshot: true };
      const { client, calls } = makeClient([makeResponse(mockOrders)]);

      const result = await client.getLiveOrders();

      expect(result).toEqual(mockOrders);
      expect(calls[0]![0]).toBe('https://localhost:5000/v1/api/iserver/account/orders');
    });
  });

  describe('placeOrder', () => {
    it('places an order and returns the response', async () => {
      const mockResp = [{ order_id: 123, order_status: 'Submitted' }];
      const { client, calls } = makeClient([makeResponse(mockResp)]);

      const result = await client.placeOrder('U1234567', [
        { conid: 265598, side: 'BUY', quantity: 10, orderType: 'MKT', tif: 'DAY' },
      ]);

      expect(result).toEqual(mockResp);
      expect(calls[0]![0]).toBe(
        'https://localhost:5000/v1/api/iserver/account/U1234567/orders',
      );
      expect(calls[0]![1]).toMatchObject({ method: 'POST' });
      expect(calls[0]![1]['body']).toBe(
        JSON.stringify({
          orders: [{ conid: 265598, side: 'BUY', quantity: 10, orderType: 'MKT', tif: 'DAY' }],
        }),
      );
    });
  });

  describe('cancelOrder', () => {
    it('cancels an order', async () => {
      const mockCancel = {
        msg: 'Request was submitted',
        order_id: 123,
        conid: 265598,
        account: 'U1234567',
      };
      const { client, calls } = makeClient([makeResponse(mockCancel)]);

      const result = await client.cancelOrder('U1234567', '123');

      expect(result).toEqual(mockCancel);
      expect(calls[0]![0]).toBe(
        'https://localhost:5000/v1/api/iserver/account/U1234567/order/123',
      );
      expect(calls[0]![1]).toMatchObject({ method: 'DELETE' });
    });
  });

  describe('confirmOrder', () => {
    it('confirms an order by reply ID', async () => {
      const mockResp = [{ order_id: 123, order_status: 'Submitted' }];
      const { client, calls } = makeClient([makeResponse(mockResp)]);

      const result = await client.confirmOrder('reply-abc', true);

      expect(result).toEqual(mockResp);
      expect(calls[0]![0]).toBe('https://localhost:5000/v1/api/iserver/reply/reply-abc');
      expect(calls[0]![1]['body']).toBe(JSON.stringify({ confirmed: true }));
    });
  });

  describe('modifyOrder', () => {
    it('modifies an existing order', async () => {
      const mockResp = [{ order_id: 123 }];
      const { client, calls } = makeClient([makeResponse(mockResp)]);

      const result = await client.modifyOrder('U1234567', '123', { price: 180.0 });

      expect(result).toEqual(mockResp);
      expect(calls[0]![0]).toBe(
        'https://localhost:5000/v1/api/iserver/account/U1234567/order/123',
      );
    });
  });

  describe('getMarketDataSnapshot', () => {
    it('returns market data snapshot', async () => {
      const mockSnapshot = [{ conid: 265598, '31': '175.50', '84': '175.48', '86': '175.52' }];
      const { client, calls } = makeClient([makeResponse(mockSnapshot)]);

      const result = await client.getMarketDataSnapshot('265598', '31,84,86');

      expect(result).toEqual(mockSnapshot);
      expect(calls[0]![0]).toBe(
        'https://localhost:5000/v1/api/iserver/marketdata/snapshot?conids=265598&fields=31,84,86',
      );
    });
  });

  describe('searchSecurities', () => {
    it('searches for securities by symbol', async () => {
      const mockResults = [{ conid: 265598, symbol: 'AAPL', companyName: 'Apple Inc.' }];
      const { client, calls } = makeClient([makeResponse(mockResults)]);

      const result = await client.searchSecurities('AAPL');

      expect(result).toEqual(mockResults);
      expect(calls[0]![0]).toBe('https://localhost:5000/v1/api/iserver/secdef/search');
      expect(calls[0]![1]).toMatchObject({ method: 'POST' });
    });
  });

  describe('getContractInfo', () => {
    it('returns contract details', async () => {
      const mockInfo = [{ con_id: 265598, symbol: 'AAPL', exchange: 'NASDAQ' }];
      const { client, calls } = makeClient([makeResponse(mockInfo)]);

      const result = await client.getContractInfo('265598');

      expect(result).toEqual(mockInfo);
      expect(calls[0]![0]).toBe(
        'https://localhost:5000/v1/api/iserver/contract/265598/info',
      );
    });
  });

  describe('getHistoricalData', () => {
    it('returns historical bars', async () => {
      const mockData = {
        startTime: '2024-01-01',
        endTime: '2024-01-31',
        startTimeVal: 1704067200000,
        endTimeVal: 1706745600000,
        data: [{ t: 1704067200000, o: 185.0, c: 186.0, h: 187.0, l: 184.0, v: 1000000 }],
        points: 1,
        mktDataDelay: 0,
      };
      const { client, calls } = makeClient([makeResponse(mockData)]);

      const result = await client.getHistoricalData('265598', '1m', '1d');

      expect(result).toEqual(mockData);
      expect(calls[0]![0]).toBe(
        'https://localhost:5000/v1/api/iserver/marketdata/history?conid=265598&period=1m&bar=1d&outsideRth=false',
      );
    });

    it('passes outsideRth=true when specified', async () => {
      const { client, calls } = makeClient([
        makeResponse({ data: [], points: 0, mktDataDelay: 0, startTimeVal: 0, endTimeVal: 0 }),
      ]);

      await client.getHistoricalData('265598', '1d', '1h', true);

      expect(calls[0]![0]).toBe(
        'https://localhost:5000/v1/api/iserver/marketdata/history?conid=265598&period=1d&bar=1h&outsideRth=true',
      );
    });
  });

  describe('error handling', () => {
    it('throws an error when the gateway returns a non-2xx response', async () => {
      const { client } = makeClient([makeErrorResponse(401, 'Not authenticated')]);

      await expect(client.getAuthStatus()).rejects.toThrow('IB Gateway error 401');
    });

    it('includes the gateway error message in the thrown error', async () => {
      const { client } = makeClient([makeErrorResponse(403, 'Access forbidden')]);

      await expect(client.getAccounts()).rejects.toThrow('Access forbidden');
    });

    it('handles empty response bodies', async () => {
      const emptyResp: FetchResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(''),
      };
      const { client } = makeClient([emptyResp]);

      const result = await client.tickle();
      expect(result).toBeUndefined();
    });

    it('handles raw (non-JSON) error text from gateway', async () => {
      const rawResp: FetchResponse = {
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      };
      const { client } = makeClient([rawResp]);

      await expect(client.getAuthStatus()).rejects.toThrow(
        'IB Gateway error 500: Internal Server Error',
      );
    });
  });

  describe('createIBClientFromEnv', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('creates an IBClient instance', () => {
      process.env = { ...originalEnv };
      const client = createIBClientFromEnv();
      expect(client).toBeInstanceOf(IBClient);
    });

    it('defaults to https://localhost:5000 when IB_GATEWAY_URL is not set', () => {
      process.env = { ...originalEnv };
      delete process.env['IB_GATEWAY_URL'];
      expect(() => createIBClientFromEnv()).not.toThrow();
    });
  });

  describe('URL construction', () => {
    it('strips trailing slash from gateway URL', async () => {
      const mockResp = makeResponse({ authenticated: true });
      let capturedUrl = '';
      const mockFn: FetchFn = (url) => {
        capturedUrl = url;
        return Promise.resolve(mockResp);
      };

      const client = new IBClient(
        { gatewayUrl: 'https://localhost:5000/', rejectUnauthorized: false },
        mockFn,
      );
      await client.getAuthStatus();

      expect(capturedUrl).toBe('https://localhost:5000/v1/api/iserver/auth/status');
    });
  });
});
