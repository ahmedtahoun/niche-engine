import type { Order } from '@/lib/orders';
import { clearAttention, moveOrder } from '../../actions';

/** The next steps an order can take from here (manual Bosta updates until the webhook is connected). */
export function OrderActions({ o, compact }: { o: Order; compact?: boolean }) {
  const b = (move: Parameters<typeof moveOrder>[1], label: string, cls = 'mini') => (
    <form action={moveOrder.bind(null, o.id, move)}><button className={cls}>{label}</button></form>
  );
  return (
    <div className={compact ? 'acts' : 'acts col'}>
      {o.status === 'accepted' && b('picked', compact ? 'Picked up' : 'Bosta picked it up')}
      {o.status === 'picked' && b('delivered', 'Delivered', 'mini pri')}
      {o.status === 'picked' && b('refused', 'Refused', 'mini danger')}
      {['awaiting_confirm', 'confirmed'].includes(o.status) && b('cancelled', compact ? 'Cancel' : 'Cancel order', 'mini danger')}
      {o.needsAttention && <form action={clearAttention.bind(null, o.id)}><button className="mini">Resolved</button></form>}
    </div>
  );
}
