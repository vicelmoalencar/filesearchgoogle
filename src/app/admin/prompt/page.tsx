'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ApiKey {
  id: string;
  name: string;
  theme: string;
  description?: string;
  customPrompt?: string;
  createdAt: string;
}

export default function PromptSettingsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadKeys();
    loadSystemPrompt();
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
      setMessage({ type: 'error', text: 'Erro ao carregar chaves de API' });
      setLoading(false);
    }
  };

  const loadSystemPrompt = async () => {
    try {
      const response = await fetch('/api/prompt');
      const data = await response.json();
      if (data.prompt) {
        setSystemPrompt(data.prompt);
      }
    } catch (error) {
      console.error('Erro ao carregar prompt do sistema:', error);
    }
  };

  const handleSaveSystemPrompt = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: systemPrompt }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: data.message || 'Prompt do sistema atualizado com sucesso!'
        });
      } else {
        const data = await response.json();
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao salvar prompt'
        });
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar prompt' });
    } finally {
      setSaving(false);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Configuração de Prompts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure o prompt padrão do sistema e visualize prompts customizados por chave
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Sistema Prompt Padrão */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Prompt Padrão do Sistema
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Este prompt é usado quando uma chave não possui um prompt customizado configurado
          </p>

          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full h-64 p-4 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono"
            placeholder="Digite o prompt padrão do sistema..."
          />

          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {systemPrompt.length} caracteres
          </div>

          <button
            onClick={handleSaveSystemPrompt}
            disabled={saving}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar Prompt Padrão'}
          </button>
        </div>

        {/* Info sobre prompts customizados */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">
            ℹ️ Prompts Customizados por Chave
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
            Para configurar um prompt específico para cada chave de API, use variáveis de ambiente no Easypanel:
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 font-mono text-sm">
            <div className="text-gray-700 dark:text-gray-300 space-y-1">
              <div><span className="text-blue-600 dark:text-blue-400">DEFAULT_KEY_PROMPT</span>=Prompt para a chave padrão...</div>
              <div><span className="text-green-600 dark:text-green-400">API_KEY_1_PROMPT</span>=Prompt para a primeira chave adicional...</div>
              <div><span className="text-green-600 dark:text-green-400">API_KEY_2_PROMPT</span>=Prompt para a segunda chave adicional...</div>
            </div>
          </div>
        </div>

        {/* Lista de chaves e seus prompts */}
        {keys.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Prompts Configurados por Chave
            </h2>

            {keys.map((key) => (
              <div
                key={key.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
              >
                {/* Key Header */}
                <div
                  className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  onClick={() => setExpandedKey(expandedKey === key.id ? null : key.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {key.theme} - {key.name}
                      </h3>
                      {key.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {key.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          key.customPrompt?.trim()
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {key.customPrompt?.trim() ? '✓ Prompt Customizado (via env)' : '○ Usando Prompt Padrão'}
                        </span>
                      </div>
                    </div>
                    <div className="text-2xl text-gray-400">
                      {expandedKey === key.id ? '▼' : '▶'}
                    </div>
                  </div>
                </div>

                {/* Prompt Viewer (Expandable) */}
                {expandedKey === key.id && (
                  <div className="p-6">
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Prompt Customizado {key.customPrompt?.trim() ? '(Somente Leitura)' : '(Não Configurado)'}
                    </label>

                    {key.customPrompt?.trim() ? (
                      <>
                        <div className="w-full p-4 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg font-mono whitespace-pre-wrap">
                          {key.customPrompt}
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Este prompt é configurado via variável de ambiente no Easypanel: {key.id === 'default' ? 'DEFAULT_KEY_PROMPT' : `API_KEY_${key.id.split('_')[2]}_PROMPT`}
                        </p>
                      </>
                    ) : (
                      <div className="w-full p-4 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                        Nenhum prompt customizado configurado. Esta chave usará o prompt padrão do sistema.
                        <br /><br />
                        Para configurar um prompt específico, adicione a variável de ambiente:
                        <br />
                        <span className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded mt-2 inline-block">
                          {key.id === 'default' ? 'DEFAULT_KEY_PROMPT' : `API_KEY_${key.id.split('_')[2]}_PROMPT`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
            💡 Dicas para prompts eficazes:
          </h3>
          <ul className="list-disc list-inside text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
            <li>Seja claro e específico sobre o comportamento esperado para este tema</li>
            <li>Defina o tom e estilo de resposta apropriado (formal, técnico, jurídico, etc.)</li>
            <li>Especifique como citar e referenciar os documentos da base de conhecimento</li>
            <li>Inclua exemplos de boas respostas quando apropriado</li>
            <li>Defina limites: o que o assistente DEVE e NÃO DEVE fazer</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
