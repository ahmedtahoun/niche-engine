import { PolicyPage, policyMetadata } from '@/components/PolicyPage';

type P = { params: Promise<{ niche: string }> };

export const generateMetadata = (p: P) => policyMetadata('privacy', p);
export default function Page(p: P) { return <PolicyPage kind="privacy" params={p.params} />; }
