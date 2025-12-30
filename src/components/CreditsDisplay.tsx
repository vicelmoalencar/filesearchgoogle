"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Coins, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
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
        // Buscar créditos
        const creditsResponse = await fetch(
          'https://ensinoplus.com.br/autocalc/api/get_credits_by_email.php',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: user.email })
          });

          const progressData = await progressResponse.json();

          if (progressData.success) {
            setProgress(progressData);
          }
        } catch (progressErr) {
          console.error('Error fetching progress:', progressErr);
          // Não mostrar erro de progresso para o usuário, apenas log
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
    <div className="flex flex-col gap-3">
      {/* Credits Display */}
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

      {/* Progress Bar */}
      {progress && progress.percentage > 0 && (
        <div className={`px-4 py-3 rounded-lg transition-all ${
          theme === 'dark'
            ? 'bg-white/5 border border-white/10'
            : 'bg-gray-100 border border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-4 h-4 ${
              progress.isReady
                ? (theme === 'dark' ? 'text-green-400' : 'text-green-600')
                : (theme === 'dark' ? 'text-blue-400' : 'text-blue-600')
            }`} />
            <span className={`text-xs font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {progress.isReady ? 'Pronto para desconto!' : 'Progresso para próximo desconto'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className={`w-full h-2 rounded-full overflow-hidden ${
            theme === 'dark' ? 'bg-white/10' : 'bg-gray-300'
          }`}>
            <div
              className={`h-full transition-all duration-500 ${
                progress.isReady
                  ? 'bg-gradient-to-r from-green-500 to-green-400'
                  : 'bg-gradient-to-r from-blue-500 to-blue-400'
              }`}
              style={{ width: `${Math.min(progress.percentage, 100)}%` }}
            />
          </div>

          {/* Progress Info */}
          <div className={`flex items-center justify-between mt-2 text-xs ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <span>{progress.accumulatedTokens.toLocaleString('pt-BR')} tokens</span>
            <span className="font-medium">{progress.percentage}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
