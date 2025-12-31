"use client";

import { X, Zap, MessageSquare, Volume2, Info } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface CreditUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreditUsageModal({ isOpen, onClose }: CreditUsageModalProps) {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-2xl rounded-xl shadow-2xl ${
        theme === 'dark'
          ? 'bg-gray-900 text-gray-100 border border-gray-800'
          : 'bg-white text-gray-900 border border-gray-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              <Info className={`w-6 h-6 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <h2 className="text-2xl font-bold">Como os Créditos são Consumidos</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Introduction */}
          <div className={`p-4 rounded-lg ${
            theme === 'dark' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
          }`}>
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
              Os créditos são consumidos com base no <strong>volume de tokens processados</strong> pela inteligência artificial.
              Cada interação acumula tokens que, ao atingir um limite, deduzem 1 crédito.
            </p>
          </div>

          {/* Token Types */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Tipos de Tokens
            </h3>

            {/* Input Tokens */}
            <div className={`p-4 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800/50 border-gray-700'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100'
                }`}>
                  <MessageSquare className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Tokens de Entrada (Input)</h4>
                  <p className={`text-sm mb-3 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Seu texto enviado, documentos carregados e todo o contexto da conversa.
                  </p>

                  {/* Progress bar showing input weight */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        Impacto no consumo
                      </span>
                      <span className="font-semibold text-green-500">~11%</span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-400"
                        style={{ width: '11%' }}
                      />
                    </div>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      1 milhão de tokens de entrada ≈ 0,11 créditos
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Output Tokens */}
            <div className={`p-4 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800/50 border-gray-700'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'
                }`}>
                  <Zap className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Tokens de Saída (Output)</h4>
                  <p className={`text-sm mb-3 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Respostas geradas pela IA, análises, resumos e todo conteúdo criado.
                  </p>

                  {/* Progress bar showing output weight */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        Impacto no consumo
                      </span>
                      <span className="font-semibold text-purple-500">~89%</span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-400"
                        style={{ width: '89%' }}
                      />
                    </div>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      1 milhão de tokens de saída ≈ 0,89 créditos
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Audio Tokens */}
            <div className={`p-4 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800/50 border-gray-700'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'bg-orange-500/20' : 'bg-orange-100'
                }`}>
                  <Volume2 className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Tokens de Áudio</h4>
                  <p className={`text-sm mb-3 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Processamento de arquivos de áudio, se disponível.
                  </p>

                  {/* Progress bar showing audio weight */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        Impacto no consumo
                      </span>
                      <span className="font-semibold text-orange-500">~36%</span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
                        style={{ width: '36%' }}
                      />
                    </div>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      1 milhão de tokens de áudio ≈ 0,36 créditos
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Como Funciona</h3>
            <ol className={`space-y-3 list-decimal list-inside ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <li>
                <strong>Acumulação Progressiva:</strong> Cada uso da IA acumula tokens processados
              </li>
              <li>
                <strong>Conversão Automática:</strong> Quando o acumulado atinge o limite, 1 crédito é deduzido
              </li>
              <li>
                <strong>Transparência:</strong> Você vê o progresso em tempo real na barra de créditos
              </li>
            </ol>
          </div>

          {/* Tips */}
          <div className={`p-4 rounded-lg border ${
            theme === 'dark'
              ? 'bg-yellow-500/10 border-yellow-500/20'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Dica para Economizar
            </h4>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Tokens de <strong>saída custam ~8x mais</strong> que tokens de entrada.
              Para economizar, seja específico nas perguntas e evite pedir respostas muito longas quando não necessário.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex justify-end p-6 border-t ${
          theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
