# MCP Interactive Brokers

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server for Interactive Brokers API integration that gives AI agents secure, sandboxed access to IB trading operations.

## Overview

This server acts as a **secure proxy** to the [Interactive Brokers Client Portal REST API](https://www.interactivebrokers.com/api/doc.html). The MCP server handles authentication to the IB gateway transparently, so AI agents never need direct access to your IB credentials.

```
AI Agent ──MCP──► mcp-interactive-brokers ──REST──► IB Client Portal Gateway ──► IB Servers
```

## Features

- **Account management** – list accounts, get balances, margin info, and P&L
- **Position monitoring** – view all open positions across accounts
- **Order management** – place, modify, cancel, and confirm orders
- **Market data** – real-time / delayed price snapshots
- **Historical data** – OHLCV bars with configurable period and bar size
- **Contract search** – find instruments by ticker symbol or company name

## Prerequisites

1. **Node.js 20+**
2. **Interactive Brokers account** (live or paper trading)
3. **IB Client Portal Gateway** running locally (see setup below)

## Setup

### 1. Start the IB Client Portal Gateway

The IB Client Portal Gateway is a Java application that authenticates with IB servers and exposes a local REST API. The easiest way to run it is with Docker:

```bash
# Copy environment template
cp .env.example .env
# Edit .env and fill in your IB credentials

# Start gateway + MCP server
docker compose up -d
```

Or run the gateway manually following the [IB documentation](https://www.interactivebrokers.com/api/doc.html#tag/Session).

### 2. Install and run the MCP server

```bash
# Install dependencies
npm install

# Build
npm run build

# Run (connects to gateway at IB_GATEWAY_URL)
IB_GATEWAY_URL=https://localhost:5000 \
IB_GATEWAY_TLS_REJECT_UNAUTHORIZED=false \
npm start
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `IB_GATEWAY_URL` | `https://localhost:5000` | URL of the IB Client Portal Gateway |
| `IB_GATEWAY_TLS_REJECT_UNAUTHORIZED` | `false` | Set to `true` to enforce TLS certificate validation (recommended for production with a valid cert) |

## MCP Client Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "interactive-brokers": {
      "command": "node",
      "args": ["/path/to/mcp-interactive-brokers/dist/index.js"],
      "env": {
        "IB_GATEWAY_URL": "https://localhost:5000",
        "IB_GATEWAY_TLS_REJECT_UNAUTHORIZED": "false"
      }
    }
  }
}
```

### Using npx (after publishing to npm)

```json
{
  "mcpServers": {
    "interactive-brokers": {
      "command": "npx",
      "args": ["-y", "mcp-interactive-brokers"],
      "env": {
        "IB_GATEWAY_URL": "https://localhost:5000",
        "IB_GATEWAY_TLS_REJECT_UNAUTHORIZED": "false"
      }
    }
  }
}
```

## Available Tools

### Authentication

| Tool | Description |
|---|---|
| `auth_status` | Check the current IB Gateway session status |
| `reauthenticate` | Re-authenticate when the session has expired |

### Accounts

| Tool | Description |
|---|---|
| `list_accounts` | List all accessible IB accounts |
| `get_account_summary` | Get balances, buying power, margin, and net liquidation value |
| `get_account_ledger` | Get P&L and cash balances by currency |

### Positions

| Tool | Description |
|---|---|
| `get_positions` | Get all open positions for an account |
| `invalidate_positions_cache` | Force a fresh position fetch |

### Orders

| Tool | Description |
|---|---|
| `get_live_orders` | List all open / pending orders |
| `place_order` | Submit a new order (MKT, LMT, STP, etc.) |
| `modify_order` | Change price, quantity, or TIF of an existing order |
| `cancel_order` | Cancel an open order |
| `confirm_order` | Reply to an IB risk warning to confirm an order |

### Market Data

| Tool | Description |
|---|---|
| `get_market_data_snapshot` | Get real-time / delayed price snapshot for one or more contracts |
| `search_securities` | Find contracts by ticker symbol or company name |
| `get_contract_info` | Get detailed contract specification |

### Historical Data

| Tool | Description |
|---|---|
| `get_historical_data` | Get OHLCV bars (period: 1d–5y, bar: 1min–1m) |

## Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Lint
npm run lint

# Build
npm run build
```

## Docker

```bash
# Build image
docker build -t mcp-interactive-brokers .

# Run with full stack (gateway + MCP server)
docker compose up
```

## Security

- IB credentials are **never** exposed to MCP clients – they are only used between the IB gateway and IB servers
- The MCP server communicates with the gateway over localhost (or an isolated Docker network)
- For production deployments, use a properly signed TLS certificate for the gateway and set `IB_GATEWAY_TLS_REJECT_UNAUTHORIZED=true`

## License

MIT
