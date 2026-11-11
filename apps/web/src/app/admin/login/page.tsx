import { LoginForm } from './LoginForm';
import '../admin.css';

export const metadata = { title: 'Admin sign in', robots: { index: false } };
// Reads ADMIN_PASSWORD at request time, not build time.
export const dynamic = 'force-dynamic';

export default function Login() {
  return (
    <div className="adm" style={{ display: 'block' }}>
      <LoginForm configured={Boolean(process.env.ADMIN_PASSWORD)} />
    </div>
  );
}
