"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Coins, Loader2, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function CreditsDisplay() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCredits() {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          'https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: user.email })
          }
        );

        const data = await response.json();

        if (data.success) {
          setCredits(data.credits);
          setError(null);
        } else {
          setError(data.message || 'Erro ao carregar créditos');
          setCredits(0);
        }
      } catch (err) {
        console.error('Error fetching credits:', err);
        setError('Erro ao conectar');
        setCredits(0);
      } finally {
        setLoading(false);
      }
    }

    fetchCredits();

    // Atualiza a cada 30 segundos
    const interval = setInterval(fetchCredits, 30000);

    return () => clearInterval(interval);
  }, [user?.email]);

  if (!user) return null;

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
        theme === 'dark' ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'
      }`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Carregando créditos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
        theme === 'dark' ? 'bg-red-900/20 text-red-400 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200'
      }`}>
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (credits === null) return null;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
      theme === 'dark'
        ? 'bg-white/5 text-gray-300 border border-white/10'
        : 'bg-gray-100 text-gray-700 border border-gray-200'
    }`}>
      <div className={`p-2 rounded-lg ${
        theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'
      }`}>
        <Coins className={`w-5 h-5 ${
          theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
        }`} />
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{credits}</span>
          <span className="text-sm opacity-70">créditos</span>
        </div>
      </div>
    </div>
  );
}
