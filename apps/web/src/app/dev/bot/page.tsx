import { notFound } from 'next/navigation';
import { transcript } from '@/bot/transport';
import { PRODUCTS, SELLERS } from '@/lib/demo-data';
import { Simulator } from './Simulator';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Seller bot simulator' };

export default async function BotSim({ searchParams }: { searchParams: Promise<{ chat?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const chats = [
    ...SELLERS.filter((s) => s.telegramChatId).map((s) => ({ id: s.telegramChatId!, label: `${s.name} (${s.status})` })),
    ...(SELLERS.some((s) => s.telegramChatId === 5555) ? [] : [{ id: 5555, label: 'متقدم جديد' }]),
  ];
  const chat = Number((await searchParams).chat ?? 1001);
  return (
    <Simulator
      chat={chat}
      chats={chats}
      log={transcript(chat)}
      pendingSellers={SELLERS.filter((s) => s.status === 'applied').map((s) => ({ id: s.id, name: s.name, chat: s.telegramChatId ?? 0 }))}
      pendingProducts={PRODUCTS.filter((p) => p.status === 'review').map((p) => ({ id: p.id, name: p.nameAr, price: p.price }))}
    />
  );
}
