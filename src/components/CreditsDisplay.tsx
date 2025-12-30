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
  const [debugLoading, setDebugLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  // Função para limpar acumulação presa
  const cleanupAccumulation = async () => {
    if (!user?.email) return;

    setCleanupLoading(true);
    console.log('\n🧹 [CLEANUP] Limpando acumulação presa...');

    try {
      const response = await fetch('/api/credits-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, action: 'delete-active' })
      });

      const data = await response.json();
      console.log('📊 [CLEANUP] Resultado:', data);

      if (data.success) {
        alert(`✅ Limpeza concluída!\n\n${data.message}\n\nDeletados: ${data.count} registro(s)\n\nAgora você pode testar a dedução novamente.`);
      } else {
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ [CLEANUP] Erro:', error);
      alert(`❌ Erro ao limpar: ${error}`);
    } finally {
      setCleanupLoading(false);
    }
  };

  // Função de debug para testar dedução manualmente
  const testDeduction = async () => {
    if (!user?.email) return;

    setDebugLoading(true);
    console.log('\n🧪 [TEST] Testando dedução manual...');
    console.log(`   Email: ${user.email}`);

    try {
      const response = await fetch('/api/credits-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });

      const data = await response.json();
      console.log('\n📊 [TEST] Resultado da API:', data);

      if (data.success) {
        console.log('✅ [TEST] Sucesso!');
        console.log('   Resultado completo:', data.result);
        console.log('\n═'.repeat(60));
        console.log('🎯 [RESUMO DO TESTE]:');
        console.log('═'.repeat(60));
        console.log('   Saldo de créditos:', data.result.creditsBalance);
        console.log('   Custo acumulado: R$', data.result.accumulatedCost?.toFixed(6));
        console.log('   Créditos deduzidos:', data.result.creditsDeducted || 0);
        console.log('   Sucesso:', data.result.success);
        console.log('   Mensagem:', data.result.message);

        if (data.result.error) {
          console.error('\n⚠️ [ERRO ENCONTRADO]:', data.result.error);
        }
        console.log('═'.repeat(60));

        alert(`✅ Teste concluído!\n\nVeja os logs detalhados no console (F12).\n\nSaldo: ${data.result.creditsBalance}\nDeduzido: ${data.result.creditsDeducted || 0}\n\n${data.result.message || ''}\n\nNÃO vou recarregar a página automaticamente.\nVocê pode copiar os logs agora!`);
      } else {
        console.error('❌ [TEST] Falha:', data.error);
        if (data.stack) {
          console.error('Stack trace:', data.stack);
        }
        alert(`❌ Erro no teste:\n\n${data.error}\n\nVeja o console para mais detalhes.`);
      }
    } catch (error) {
      console.error('❌ [TEST] Erro ao chamar API:', error);
      alert(`❌ Erro ao chamar API:\n\n${error}\n\nVeja o console para mais detalhes.`);
    } finally {
      setDebugLoading(false);
    }
  };

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

          {/* Debug Buttons - only show if ready for deduction */}
          {progress.isReady && (
            <div className="mt-3 space-y-2">
              <button
                onClick={testDeduction}
                disabled={debugLoading || cleanupLoading}
                className={`w-full px-3 py-2 text-xs font-medium rounded-md transition-all ${
                  debugLoading || cleanupLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:opacity-80'
                } ${
                  theme === 'dark'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-500 text-white'
                }`}
              >
                {debugLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Testando...
                  </span>
                ) : (
                  '🧪 Testar Dedução (Debug)'
                )}
              </button>

              <button
                onClick={cleanupAccumulation}
                disabled={debugLoading || cleanupLoading}
                className={`w-full px-3 py-2 text-xs font-medium rounded-md transition-all ${
                  debugLoading || cleanupLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:opacity-80'
                } ${
                  theme === 'dark'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-500 text-white'
                }`}
              >
                {cleanupLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Limpando...
                  </span>
                ) : (
                  '🧹 Limpar Acumulação Presa'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
