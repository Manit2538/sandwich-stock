// src/lib/channels/types.ts
export type NormalizedOrder = {
  channelCode: string;
  externalOrderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string | null;
  note: string | null;
  items: { externalItemId: string; name: string; qty: number; unitPrice: number }[];
  total: number;
  commission: number;
  placedAt: string;
};

export interface ChannelAdapter {
  code: string;
  verifySignature(rawBody: string, headers: Headers): boolean;
  parseOrder(payload: unknown): NormalizedOrder;
  acceptOrder(externalOrderId: string): Promise<void>;
  rejectOrder(externalOrderId: string, reason: string): Promise<void>;
  markReady(externalOrderId: string): Promise<void>;
  pushMenuAvailability(items: { externalItemId: string; available: boolean }[]): Promise<void>;
}