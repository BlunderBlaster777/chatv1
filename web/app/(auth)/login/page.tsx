'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    router.push('/chat/ch_general');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-discord-servers">
      <form onSubmit={submit} className="bg-discord-sidebar p-8 rounded-xl w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center text-white">Welcome back</h1>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <input
          className="w-full bg-discord-servers text-discord-text px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-discord-accent"
          placeholder="Username"
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
        />
        <input
          type="password"
          className="w-full bg-discord-servers text-discord-text px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-discord-accent"
          placeholder="Password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        />
        <button type="submit"
          className="w-full bg-discord-accent hover:bg-indigo-500 text-white py-2 rounded-md font-medium transition">
          Log In
        </button>
        <p className="text-discord-muted text-sm text-center">
          No account?{' '}
          <Link href="/register" className="text-discord-accent hover:underline">Register</Link>
        </p>
      </form>
    </div>
  );
}
