"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Coins, Loader2, AlertCircle, Info } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import CreditUsageModal from './CreditUsageModal';

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
  const [showModal, setShowModal] = useState(false);

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
          console.log('🔄 [CREDITS UI] Buscando progresso de acumulação...');
          const progressResponse = await fetch('/api/credits-progress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: user.email })
          });

          console.log(`   Status: ${progressResponse.status}`);
          const progressData = await progressResponse.json();
          console.log('   Resposta:', progressData);

          if (progressData.success) {
            setProgress(progressData);
            console.log('✅ [CREDITS UI] Progresso atualizado:', {
              percentage: progressData.percentage,
              accumulatedCost: progressData.accumulatedCost,
              tokens: progressData.accumulatedTokens,
              isReady: progressData.isReady
            });
          } else {
            console.warn('⚠️ [CREDITS UI] Resposta sem sucesso:', progressData);
          }
        } catch (progressErr) {
          console.error('❌ [CREDITS UI] Erro ao buscar progresso:', progressErr);
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
    <>
      <CreditUsageModal isOpen={showModal} onClose={() => setShowModal(false)} />

      <div className={`flex flex-col px-3 py-1.5 rounded-lg transition-all ${
        theme === 'dark'
          ? 'bg-white/5 text-gray-300 border border-white/10'
          : 'bg-gray-100 text-gray-700 border border-gray-200'
      }`}>
        {/* Credits Display */}
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${
            theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'
          }`}>
            <Coins className={`w-4 h-4 ${
              theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
            }`} />
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold">{credits}</span>
            <span className="text-xs opacity-70">créditos</span>
          </div>

          {/* Info Button */}
          <button
            onClick={() => setShowModal(true)}
            className={`ml-auto p-1 rounded-md transition-colors ${
              theme === 'dark'
                ? 'hover:bg-white/10 text-gray-400 hover:text-gray-200'
                : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
            }`}
            title="Como os créditos são consumidos"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar - Com percentual à esquerda */}
        {progress && progress.percentage > 0 && (
          <div className="flex items-center gap-2 mt-2">
            {/* Indicador circular e percentual */}
            <div className="flex items-center gap-1.5 min-w-[60px]">
              <div className={`w-2 h-2 rounded-full ${
                progress.isReady
                  ? 'bg-green-500'
                  : 'bg-blue-500'
              }`} />
              <span className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {progress.percentage.toFixed(1)}%
              </span>
            </div>

            {/* Barra de progresso */}
            <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${
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
          </div>
        )}
      </div>
    </>
  );
}
