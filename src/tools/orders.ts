import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { IBClient } from '../client.js';
import { OrderSide, OrderType, OrderTIF } from '../types.js';

const OrderSideEnum = z.enum(['BUY', 'SELL'] as [OrderSide, ...OrderSide[]]);
const OrderTypeEnum = z.enum(['MKT', 'LMT', 'STP', 'STP LMT', 'MIDPRICE', 'TRAIL', 'TRAIL LIMIT'] as [OrderType, ...OrderType[]]);
const OrderTIFEnum = z.enum(['DAY', 'GTC', 'OPG', 'IOC', 'PAX', 'GTD', 'MOC', 'LOC'] as [OrderTIF, ...OrderTIF[]]);

/**
 * Register order-related MCP tools on the server.
 */
export function registerOrderTools(server: McpServer, client: IBClient): void {
  // -------------------------------------------------------------------------
  // get_live_orders – list open/pending orders
  // -------------------------------------------------------------------------
  server.tool(
    'get_live_orders',
    'Get all live (open / pending) orders for the authenticated user.',
    {},
    async () => {
      const result = await client.getLiveOrders();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // -------------------------------------------------------------------------
  // place_order – submit a single order
  // -------------------------------------------------------------------------
  server.tool(
    'place_order',
    'Place a new order for a specific account and contract.',
    {
      accountId: z.string().describe('The IB account ID (e.g. "U1234567")'),
      conid: z.number().int().positive().describe('Contract ID of the instrument to trade'),
      side: OrderSideEnum.describe('Order side: BUY or SELL'),
      quantity: z.number().positive().describe('Number of shares / units to trade'),
      orderType: OrderTypeEnum.describe('Order type: MKT, LMT, STP, STP LMT, MIDPRICE, TRAIL, TRAIL LIMIT'),
      tif: OrderTIFEnum.describe('Time-in-force: DAY, GTC, IOC, etc.'),
      price: z.number().optional().describe('Limit price (required for LMT, STP LMT, TRAIL LIMIT orders)'),
      auxPrice: z.number().optional().describe('Auxiliary price – stop price for STP / TRAIL orders'),
      outsideRTH: z.boolean().optional().describe('Allow execution outside regular trading hours'),
      cOID: z.string().optional().describe('Custom order ID (client-defined reference)'),
    },
    async ({ accountId, conid, side, quantity, orderType, tif, price, auxPrice, outsideRTH, cOID }) => {
      const order = {
        conid,
        orderType,
        side,
        quantity,
        tif,
        ...(price !== undefined && { price }),
        ...(auxPrice !== undefined && { auxPrice }),
        ...(outsideRTH !== undefined && { outsideRTH }),
        ...(cOID !== undefined && { cOID }),
      };
      const result = await client.placeOrder(accountId, [order]);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // -------------------------------------------------------------------------
  // modify_order – change an existing order
  // -------------------------------------------------------------------------
  server.tool(
    'modify_order',
    'Modify an existing order (e.g. change price or quantity).',
    {
      accountId: z.string().describe('The IB account ID (e.g. "U1234567")'),
      orderId: z.string().describe('The order ID to modify'),
      orderType: OrderTypeEnum.optional().describe('New order type'),
      price: z.number().optional().describe('New limit price'),
      quantity: z.number().positive().optional().describe('New quantity'),
      tif: OrderTIFEnum.optional().describe('New time-in-force'),
    },
    async ({ accountId, orderId, orderType, price, quantity, tif }) => {
      const update: Record<string, unknown> = {};
      if (orderType !== undefined) update['orderType'] = orderType;
      if (price !== undefined) update['price'] = price;
      if (quantity !== undefined) update['quantity'] = quantity;
      if (tif !== undefined) update['tif'] = tif;
      const result = await client.modifyOrder(accountId, orderId, update);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // -------------------------------------------------------------------------
  // cancel_order – cancel an open order
  // -------------------------------------------------------------------------
  server.tool(
    'cancel_order',
    'Cancel an open order.',
    {
      accountId: z.string().describe('The IB account ID (e.g. "U1234567")'),
      orderId: z.string().describe('The order ID to cancel'),
    },
    async ({ accountId, orderId }) => {
      const result = await client.cancelOrder(accountId, orderId);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // -------------------------------------------------------------------------
  // confirm_order – reply to an order warning / confirmation prompt
  // -------------------------------------------------------------------------
  server.tool(
    'confirm_order',
    'Confirm a pending order that requires an explicit reply (e.g. to a risk warning from IB).',
    {
      replyId: z.string().describe('The reply ID returned by place_order when a confirmation is required'),
      confirmed: z.boolean().describe('Whether to confirm (true) or reject (false) the order'),
    },
    async ({ replyId, confirmed }) => {
      const result = await client.confirmOrder(replyId, confirmed);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
