/**
 * TypeScript types for the Interactive Brokers Client Portal API
 */

export interface IBGatewayConfig {
  gatewayUrl: string;
  rejectUnauthorized: boolean;
}

export interface AuthStatus {
  authenticated: boolean;
  competing: boolean;
  connected: boolean;
  message?: string;
  MAC?: string;
  serverInfo?: {
    serverVersion?: string;
    sessionId?: string;
  };
}

export interface Account {
  id: string;
  accountId: string;
  accountVan: string;
  accountTitle: string;
  displayName: string;
  accountAlias?: string;
  startDate?: string;
  currency: string;
  type: string;
  tradingType: string;
  ibEntity: string;
  faclient: boolean;
  covestor: boolean;
  noClientTrading: boolean;
  trackVirtualFXPortfolio: boolean;
  acctCustType: string;
  parent?: {
    mmc?: string;
    accountId?: string;
    isMParent?: boolean;
    isMChild?: boolean;
    isMultiplex?: boolean;
  };
  desc?: string;
}

export interface AccountSummary {
  accountready: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  accounttype?: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  availablefunds: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  buyingpower: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  cushion: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  equitywithloanvalue: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  excessliquidity: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  fullavailablefunds: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  fullexcessliquidity: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  fullinitmarginreq: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  fullmaintmarginreq: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  grosspositionvalue: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  initmarginreq: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  leverage: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  lookaheadavailablefunds: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  lookaheadexcessliquidity: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  lookaheadinitmarginreq: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  lookaheadmaintmarginreq: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  maintmarginreq: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  netliquidation: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  netliquidationuncertainty: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  segmenttitle?: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  totalcashbalance?: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  totalcashvalue: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
  totaldebitcardpendingcharges?: { amount: string; currency: string; isNull: boolean; timestamp: number; value: string };
}

export interface Position {
  acctId: string;
  conid: number;
  contractDesc: string;
  assetClass: string;
  position: number;
  mktPrice: number;
  mktValue: number;
  currency: string;
  avgCost: number;
  avgPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  exchs?: string;
  expiry?: string;
  putOrCall?: string;
  multiplier?: number;
  strike?: number;
  exerciseStyle?: string;
  conExchMap?: string[];
  listingExch?: string;
  undConid?: number;
  model?: string;
  incrementRules?: Array<{
    lowerEdge: number;
    increment: number;
  }>;
  displayRule?: {
    magnification: number;
    displayRuleStep: Array<{
      decimalDigits: number;
      lowerEdge: number;
      wholeDigits: number;
    }>;
  };
  time?: number;
  fullName?: string;
  pageSize?: number;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MKT' | 'LMT' | 'STP' | 'STP LMT' | 'MIDPRICE' | 'TRAIL' | 'TRAIL LIMIT';
export type OrderTIF = 'DAY' | 'GTC' | 'OPG' | 'IOC' | 'PAX' | 'GTD' | 'MOC' | 'LOC';
export type OrderStatus = 'PreSubmitted' | 'Submitted' | 'Filled' | 'Cancelled' | 'Inactive' | 'PendingSubmit' | 'PendingCancel' | 'WarnState' | 'SortLost';

export interface Order {
  acct: string;
  conidex: string;
  conid: number;
  account: string;
  orderId: number;
  cashCcy: string;
  sizeAndFills: string;
  orderDesc: string;
  description1: string;
  ticker: string;
  secType: string;
  listingExchange: string;
  remainingQuantity: number;
  filledQuantity: number;
  companyName: string;
  status: OrderStatus;
  order_ccp_status: string;
  avgPrice: string;
  origOrderType: string;
  supportsTaxOpt: string;
  lastExecutionTime: string;
  orderType: string;
  bgColor: string;
  fgColor: string;
  isEventTrading: string;
  price: string;
  timeInForce: string;
  lastExecutionTime_r: number;
  side: string;
}

export interface PlaceOrderRequest {
  conid: number;
  secType?: string;
  cOID?: string;
  parentId?: string;
  orderType: OrderType;
  listingExchange?: string;
  isSingleGroup?: boolean;
  outsideRTH?: boolean;
  price?: number;
  auxPrice?: number;
  side: OrderSide;
  ticker?: string;
  tif: OrderTIF;
  referrer?: string;
  quantity: number;
  fxQty?: number;
  useAdaptive?: boolean;
  isCcyConv?: boolean;
  allocationMethod?: string;
  strategy?: string;
  strategyParameters?: Record<string, unknown>;
}

export interface PlaceOrderResponse {
  id?: string;
  message?: string[];
  order_id?: number;
  order_status?: string;
  encrypt_message?: string;
}

export interface MarketDataSnapshot {
  conid: number;
  '31'?: string;   // Last Price
  '84'?: string;   // Bid
  '86'?: string;   // Ask
  '85'?: string;   // Ask Size
  '88'?: string;   // Bid Size
  '7295'?: string; // Open
  '7296'?: string; // Close
  '70'?: string;   // High
  '71'?: string;   // Low
  '87'?: string;   // Volume
  '6509'?: string; // Market Data Availability
  '55'?: string;   // Symbol
  '7051'?: string; // Company Name
  '6072'?: string; // PE Ratio
  '7067'?: string; // EPS
  '7068'?: string; // Market Cap
  [key: string]: string | number | undefined;
}

export interface HistoricalBar {
  t: number;  // timestamp
  o: number;  // open
  c: number;  // close
  h: number;  // high
  l: number;  // low
  v: number;  // volume
}

export interface HistoricalData {
  startTime: string;
  startTimeVal: number;
  endTime: string;
  endTimeVal: number;
  data: HistoricalBar[];
  points: number;
  mktDataDelay: number;
}

export interface ContractInfo {
  cfi_code: string;
  symbol: string;
  cusip?: string;
  expiry_full?: string;
  con_id: number;
  maturity_date?: string;
  industry?: string;
  instrument_type: string;
  trading_class?: string;
  valid_exchanges: string;
  allow_sell_long: boolean;
  is_zero_commission_security: boolean;
  local_symbol: string;
  currency: string;
  company_name: string;
  smart_available: boolean;
  exchange: string;
}

export interface SecuritySearchResult {
  conid: number;
  companyHeader: string;
  companyName: string;
  symbol: string;
  description: string;
  restricted?: string;
  fop?: string;
  opt?: string;
  war?: string;
  sections: Array<{
    secType: string;
    months?: string;
    symbol?: string;
    exchange?: string;
    legSecType?: string;
  }>;
}

export interface IBError {
  error: string;
  statusCode?: number;
}
