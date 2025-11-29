'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ApiKey {
  id: string;
  name: string;
  theme: string;
  description?: string;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      const data = await response.json();
      if (data.keys) {
        setKeys(data.keys);
      }
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar chaves:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 flex items-center gap-2"
          >
            ← Voltar para Admin
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Chaves de API Configuradas
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Visualize as chaves de API do Gemini configuradas via variáveis de ambiente
            </p>
          </div>
        </div>

        {/* Info sobre variáveis de ambiente */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 text-lg">
            ⚙️ Como configurar as chaves de API
          </h3>
          <p className="text-blue-800 dark:text-blue-300 mb-4">
            As chaves de API são configuradas via variáveis de ambiente no Easypanel para maior segurança.
          </p>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Chave Padrão (obrigatória):
            </h4>
            <div className="font-mono text-sm space-y-1 text-gray-700 dark:text-gray-300">
              <div><span className="text-blue-600 dark:text-blue-400">GEMINI_API_KEY</span>=sua-chave-aqui</div>
              <div><span className="text-blue-600 dark:text-blue-400">DEFAULT_KEY_NAME</span>=Nome da Chave (opcional)</div>
              <div><span className="text-blue-600 dark:text-blue-400">DEFAULT_KEY_THEME</span>=Tema (opcional)</div>
              <div><span className="text-blue-600 dark:text-blue-400">DEFAULT_KEY_DESCRIPTION</span>=Descrição (opcional)</div>
              <div><span className="text-blue-600 dark:text-blue-400">DEFAULT_KEY_PROMPT</span>=Prompt customizado (opcional)</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Chaves Adicionais (opcional):
            </h4>
            <div className="font-mono text-sm space-y-1 text-gray-700 dark:text-gray-300 mb-2">
              <div><span className="text-green-600 dark:text-green-400">API_KEY_1_NAME</span>=Jurisprudência</div>
              <div><span className="text-green-600 dark:text-green-400">API_KEY_1_KEY</span>=AIza...</div>
              <div><span className="text-green-600 dark:text-green-400">API_KEY_1_THEME</span>=Direito</div>
              <div><span className="text-green-600 dark:text-green-400">API_KEY_1_DESCRIPTION</span>=Chave para consultas jurídicas</div>
              <div><span className="text-green-600 dark:text-green-400">API_KEY_1_PROMPT</span>=Atue como especialista em direito...</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Continue com API_KEY_2_*, API_KEY_3_*, etc. para adicionar mais chaves
            </p>
          </div>
        </div>

        {/* Lista de chaves configuradas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Chaves Configuradas ({keys.length})
            </h2>
          </div>

          {keys.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                Nenhuma chave de API configurada
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure a variável de ambiente <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">GEMINI_API_KEY</span> no Easypanel
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {keys.map((key) => (
                <div key={key.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {key.name}
                        </h3>
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                          {key.theme}
                        </span>
                      </div>
                      {key.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {key.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>ID: <span className="font-mono">{key.id}</span></span>
                        <span>Criada: {new Date(key.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {key.id === 'default' && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs">
                          Padrão
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Links úteis */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/admin/prompt"
            className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              ⚙️ Configurar Prompt do Sistema
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure o prompt padrão usado quando uma chave não tem prompt customizado
            </p>
          </a>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-1">
              💡 Prompts Customizados
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Configure prompts específicos para cada chave usando a variável API_KEY_N_PROMPT
            </p>
          </div>
        </div>

        {/* Instruções detalhadas */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            📋 Passo a passo para configurar no Easypanel:
          </h3>
          <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <li>Acesse o painel do Easypanel</li>
            <li>Navegue até seu projeto/aplicação</li>
            <li>Vá na seção "Environment Variables" ou "Variáveis de Ambiente"</li>
            <li>Adicione as variáveis seguindo os exemplos acima</li>
            <li>Salve e reinicie a aplicação</li>
            <li>Recarregue esta página para ver as chaves configuradas</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
