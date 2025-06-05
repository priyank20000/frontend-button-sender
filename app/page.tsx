// app/login/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Lock, Mail } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      console.log('Token found on login page:', token.substring(0, 10) + '...');
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`https://whatsapp.recuperafly.com/api/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('Login API response:', data);

      if (data.success) {
        const token = data.token;
        console.log('Setting token:', token.substring(0, 10) + '...');
        Cookies.set('token', token, {
          expires: 1, // 1 day
          secure: process.env.NODE_ENV === 'production', // Secure only in production
          sameSite: 'Lax', // Allow cookie during redirects
          path: '/', // Accessible across all routes
          domain: process.env.NODE_ENV === 'production' ? 'whatsapp.recuperafly.com' : undefined, // Domain for production
        });
        Cookies.set('user', JSON.stringify(data.user), {
          expires: 1,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Lax',
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? 'whatsapp.recuperafly.com' : undefined,
        });

        // Verify cookie is set
        const storedToken = Cookies.get('token');
        console.log('Stored token after set:', storedToken ? storedToken.substring(0, 10) + '...' : 'Not found');

        // Delay redirect to ensure cookie is set
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      } else {
        setError(data.message || 'Failed to login. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-black border-zinc-800">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-200">Welcome</h1>
          <p className="text-zinc-400 mt-2">Login to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-200"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-200"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </Card>
    </div>
  );
}