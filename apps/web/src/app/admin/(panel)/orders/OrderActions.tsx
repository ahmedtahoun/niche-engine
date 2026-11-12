import type { Order } from '@/lib/orders';
import { clearAttention, confirmForSellers, moveOrder } from '../../actions';

/**
 * The next steps an order can take from here. While you run a seller's orders yourself (or Bosta
 * isn't connected) you move every stage by hand: confirm, handed to courier, delivered or refused.
 */
export function OrderActions({ o, compact }: { o: Order; compact?: boolean }) {
  const b = (move: Parameters<typeof moveOrder>[1], label: string, cls = 'mini') => (
    <form action={moveOrder.bind(null, o.id, move)}><button className={cls}>{label}</button></form>
  );
  const pending = Object.values(o.sellerState).some((p) => p === 'pending');
  return (
    <div className={compact ? 'acts' : 'acts col'}>
      {(o.status === 'awaiting_confirm' || (o.status === 'confirmed' && pending)) && (
        <form action={confirmForSellers.bind(null, o.id)}><button className="mini pri">{compact ? '✓ Confirm' : '✓ Confirm order (seller accepted)'}</button></form>
      )}
      {o.status === 'accepted' && b('picked', compact ? '📦 Shipped' : '📦 Handed to courier', 'mini pri')}
      {o.status === 'accepted' && !compact && b('delivered', '✅ Delivered (own courier)')}
      {o.status === 'picked' && b('delivered', '✅ Delivered', 'mini pri')}
      {o.status === 'picked' && b('refused', '↩ Refused', 'mini danger')}
      {['awaiting_confirm', 'confirmed', 'accepted'].includes(o.status) && b('cancelled', compact ? 'Cancel' : 'Cancel order', 'mini danger')}
      {o.needsAttention && <form action={clearAttention.bind(null, o.id)}><button className="mini">Resolved</button></form>}
    </div>
  );
}
