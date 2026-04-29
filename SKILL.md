# SKILL: mcp-interactive-brokers

This document describes how AI agents can use the `mcp-interactive-brokers` MCP server to interact with Interactive Brokers (IBKR) accounts.

## Server Setup (operator)

Before agents can use this skill, a human operator must:

1. Have an active Interactive Brokers account (live or paper)
2. Run the IB Client Portal Gateway (see README.md)
3. Configure the MCP server with `IB_GATEWAY_URL` pointing to the running gateway

Agents **never** see IB credentials – authentication is handled server-side.

---

## Workflow

### 1. Check authentication

Always start by verifying the gateway session is active:

```
auth_status
```

If `authenticated` is `false`, call:

```
reauthenticate
```

### 2. Discover accounts

```
list_accounts
```

Note the `accountId` values (e.g. `U1234567`) – most tools require this.

---

## Tool Reference

### `auth_status`
Check whether the IB Gateway session is authenticated.

**Returns:** `{ authenticated: boolean, connected: boolean, competing: boolean }`

### `reauthenticate`
Re-authenticate the gateway session (call when `authenticated` is false).

### `list_accounts`
List all IB accounts accessible to the authenticated user.

**Returns:** Array of account objects with `accountId`, `currency`, `type`, etc.

### `get_account_summary`
Get account balances, buying power, margin requirements, and net liquidation value.

**Parameters:**
- `accountId` (string, required) – e.g. `"U1234567"`

**Key fields in response:**
- `netliquidation.value` – Total net liquidation value
- `availablefunds.value` – Available funds for trading
- `buyingpower.value` – Buying power
- `unrealizedpnl.value` – Unrealized P&L

### `get_account_ledger`
Get per-currency cash balances and P&L breakdown.

**Parameters:**
- `accountId` (string, required)

### `get_positions`
Get all open positions for an account.

**Parameters:**
- `accountId` (string, required)
- `page` (number, optional, default: 0) – For pagination

**Key fields per position:**
- `conid` – Contract ID
- `contractDesc` – Instrument description
- `position` – Number of shares/units held
- `mktPrice` – Current market price
- `mktValue` – Current market value
- `unrealizedPnl` – Unrealized P&L
- `avgCost` – Average cost basis

### `invalidate_positions_cache`
Force the next `get_positions` call to fetch fresh data (bypasses gateway cache).

**Parameters:**
- `accountId` (string, required)

### `get_live_orders`
Get all open and pending orders for the authenticated user.

**Key fields per order:**
- `orderId` – Order ID
- `ticker` – Symbol
- `side` – BUY or SELL
- `orderType` – MKT, LMT, etc.
- `status` – Current order status
- `remainingQuantity` – Unfilled quantity
- `price` – Limit price (if applicable)

### `place_order`
Submit a new order.

**Parameters:**
- `accountId` (string, required)
- `conid` (number, required) – Contract ID (use `search_securities` to find)
- `side` (string, required) – `"BUY"` or `"SELL"`
- `quantity` (number, required) – Number of shares/units
- `orderType` (string, required) – `"MKT"`, `"LMT"`, `"STP"`, `"STP LMT"`, `"MIDPRICE"`, `"TRAIL"`, `"TRAIL LIMIT"`
- `tif` (string, required) – Time-in-force: `"DAY"`, `"GTC"`, `"IOC"`, `"MOC"`, etc.
- `price` (number, optional) – Limit price (required for LMT / STP LMT)
- `auxPrice` (number, optional) – Stop price (for STP / TRAIL orders)
- `outsideRTH` (boolean, optional) – Allow outside regular trading hours
- `cOID` (string, optional) – Custom order reference

**Note:** The response may contain a `message` array with a `replyId` requiring confirmation via `confirm_order`.

### `modify_order`
Modify price, quantity, or TIF of an existing order.

**Parameters:**
- `accountId` (string, required)
- `orderId` (string, required)
- `orderType` (string, optional)
- `price` (number, optional)
- `quantity` (number, optional)
- `tif` (string, optional)

### `cancel_order`
Cancel an open order.

**Parameters:**
- `accountId` (string, required)
- `orderId` (string, required)

### `confirm_order`
Confirm (or reject) a pending order after an IB risk warning.

**Parameters:**
- `replyId` (string, required) – From the `place_order` response
- `confirmed` (boolean, required) – `true` to proceed, `false` to cancel

### `get_market_data_snapshot`
Get a price snapshot for one or more contracts.

**Parameters:**
- `conids` (string, required) – Comma-separated contract IDs, e.g. `"265598,8314"`
- `fields` (string, optional) – Comma-separated field codes (default includes last, bid, ask, OHLCV)

**Common field codes:**
- `31` – Last price
- `84` – Bid price
- `86` – Ask price
- `87` – Volume
- `70` / `71` – High / Low
- `7295` / `7296` – Open / Prior close

### `search_securities`
Search for instruments by ticker symbol or company name.

**Parameters:**
- `symbol` (string, required) – Ticker or partial company name
- `secType` (string, optional) – `"STK"`, `"OPT"`, `"FUT"`, `"CASH"`, etc.
- `name` (boolean, optional) – `true` to search by company name

**Returns:** Array of matches with `conid`, `symbol`, `companyName`, and available `sections`.

### `get_contract_info`
Get full contract specification (exchange, currency, multiplier, etc.).

**Parameters:**
- `conid` (string, required) – Contract ID

### `get_historical_data`
Get OHLCV candlestick data for a contract.

**Parameters:**
- `conid` (string, required) – Contract ID
- `period` (string, required) – Total period: `"1d"`, `"1w"`, `"1m"`, `"3m"`, `"6m"`, `"1y"`, `"2y"`, `"5y"`
- `bar` (string, required) – Bar size: `"1min"`, `"5min"`, `"15min"`, `"30min"`, `"1h"`, `"4h"`, `"1d"`, `"1w"`, `"1m"`
- `outsideRth` (boolean, optional) – Include pre/after-market data

**Returns:** Object with `data` array of bars: `{ t, o, h, l, c, v }` (timestamp, open, high, low, close, volume)

---

## Example Agent Workflows

### Check portfolio value
```
1. auth_status                          → verify authenticated
2. list_accounts                        → get accountId
3. get_account_summary(accountId)       → get net liquidation value
4. get_positions(accountId)             → get individual holdings
```

### Look up a stock price
```
1. search_securities("AAPL", "STK")    → get conid (e.g. 265598)
2. get_market_data_snapshot("265598")   → get current bid/ask/last
```

### Get a stock chart
```
1. search_securities("TSLA", "STK")    → get conid (e.g. 76792991)
2. get_historical_data("76792991", "3m", "1d")  → get 3 months of daily bars
```

### Place a market buy order
```
1. auth_status                          → verify authenticated
2. list_accounts                        → get accountId
3. search_securities("AAPL", "STK")    → get conid = 265598
4. place_order(accountId, conid=265598, side="BUY", quantity=10, orderType="MKT", tif="DAY")
   → if response has message[].id, call confirm_order(replyId, true)
5. get_live_orders                      → verify order status
```
