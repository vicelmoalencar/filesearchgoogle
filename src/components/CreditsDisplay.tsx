"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Coins, Loader2, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface CreditsProgress {
  accumulatedCost: number;
  accumulatedTokens: number;
  costPerCredit: number;
  costRemaining: number;
  percentage: number;
  isReady: boolean;
}

export default function CreditsDisplay() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [credits, setCredits] = useState<number | null>(null);
  const [progress, setProgress] = useState<CreditsProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCredits() {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        const creditsResponse = await fetch(
          'https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email })
          }
        );

        const creditsData = await creditsResponse.json();

        if (creditsData.success) {
          setCredits(creditsData.credits);
          setError(null);
        } else {
          setError(creditsData.message || 'Erro ao carregar créditos');
          setCredits(0);
        }

        // Buscar progresso de acumulação
        try {
          const progressResponse = await fetch('/api/credits-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email })
          });

          const progressData = await progressResponse.json();
          if (progressData.success) {
            setProgress(progressData);
          }
        } catch {
          // não exibir erro de progresso ao usuário
        }
      } catch {
        setError('Erro ao conectar');
        setCredits(0);
      } finally {
        setLoading(false);
      }
    }

    fetchCredits();
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, [user?.email]);

  if (!user) return null;

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        theme === 'dark' ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'
      }`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm hidden sm:inline">Créditos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        theme === 'dark' ? 'bg-red-900/20 text-red-400 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200'
      }`}>
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm hidden sm:inline">{error}</span>
      </div>
    );
  }

  if (credits === null) return null;

  return (
    <div
      className={`relative px-3 py-2 rounded-xl transition-all ${
        theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
      }`}
      title={progress ? `Progresso: ${progress.percentage}% — Faltam R$ ${progress.costRemaining.toFixed(4)} para próximo crédito` : ''}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center flex-shrink-0">
          <Coins className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {credits}
          </span>
          <span className={`text-xs hidden sm:inline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            créditos
          </span>
        </div>
      </div>

      {progress && progress.percentage > 0 && (
        <div className={`w-full h-1 rounded-full overflow-hidden mt-1.5 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}>
          <div
            className={`h-full transition-all duration-500 ${progress.isReady ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(progress.percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
