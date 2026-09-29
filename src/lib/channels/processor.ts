// src/lib/channels/processor.ts
export async function processPendingEvents() {
  const { data: events } = await sb
    .from('channel_order_events')
    .select('*')
    .eq('processed', false)
    .order('received_at')
    .limit(20);

  for (const ev of events ?? []) {
    try {
      const adapter = getAdapter(ev.channel_code);
      const order = adapter.parseOrder(ev.raw_payload);

      // 1. แมป external_item_id -> menu_item_id ของเรา
      // 2. เช็กวัตถุดิบพอไหม (ใช้ logic shortages เดิมได้เลย)
      // 3. insert customer_orders + customer_order_items
      // 4. ถ้าวัตถุดิบไม่พอ -> adapter.rejectOrder()
      //    ถ้าพอ -> adapter.acceptOrder()

      await sb.from('channel_order_events')
        .update({ processed: true }).eq('id', ev.id);
    } catch (e) {
      await sb.from('channel_order_events')
        .update({ error_message: String(e) }).eq('id', ev.id);
    }
  }
}