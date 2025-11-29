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
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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

        // Inicializar prompts no estado
        const initialPrompts: Record<string, string> = {};
        data.keys.forEach((key: ApiKey) => {
          initialPrompts[key.id] = key.customPrompt || '';
        });
        setPrompts(initialPrompts);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar chaves:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar chaves de API' });
      setLoading(false);
    }
  };

  const handleSavePrompt = async (keyId: string) => {
    setSaving(keyId);
    setMessage(null);

    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customPrompt: prompts[keyId]
        }),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Prompt da chave "${keys.find(k => k.id === keyId)?.name}" atualizado com sucesso!`
        });

        // Recarregar para pegar os dados atualizados
        await loadKeys();
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
      setSaving(null);
    }
  };

  const handleResetPrompt = async (keyId: string) => {
    if (!confirm('Deseja realmente limpar o prompt customizado? O sistema usará o prompt padrão.')) {
      return;
    }

    setSaving(keyId);
    setMessage(null);

    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customPrompt: ''
        }),
      });

      if (response.ok) {
        setPrompts(prev => ({ ...prev, [keyId]: '' }));
        setMessage({
          type: 'success',
          text: `Prompt da chave "${keys.find(k => k.id === keyId)?.name}" removido. Usando prompt padrão.`
        });
        await loadKeys();
      } else {
        const data = await response.json();
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao limpar prompt'
        });
      }
    } catch (error) {
      console.error('Erro ao limpar:', error);
      setMessage({ type: 'error', text: 'Erro ao limpar prompt' });
    } finally {
      setSaving(null);
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
            Gerenciar Prompts por Chave
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure um prompt específico para cada chave de API / tema
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

        {/* Info Box */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
            ℹ️ Como funciona:
          </h3>
          <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>Cada chave pode ter seu próprio prompt customizado</li>
            <li>Se uma chave não tiver prompt customizado, ela usará o prompt padrão do sistema</li>
            <li>O prompt é usado quando o usuário seleciona essa chave no chat</li>
          </ul>
        </div>

        {/* Keys List */}
        {keys.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Nenhuma chave de API cadastrada ainda.
            </p>
            <button
              onClick={() => router.push('/admin/api-keys')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Gerenciar Chaves de API
            </button>
          </div>
        ) : (
          <div className="space-y-4">
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
                          prompts[key.id]?.trim()
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {prompts[key.id]?.trim() ? '✓ Prompt Customizado' : '○ Usando Prompt Padrão'}
                        </span>
                      </div>
                    </div>
                    <div className="text-2xl text-gray-400">
                      {expandedKey === key.id ? '▼' : '▶'}
                    </div>
                  </div>
                </div>

                {/* Prompt Editor (Expandable) */}
                {expandedKey === key.id && (
                  <div className="p-6">
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Prompt Customizado
                    </label>
                    <textarea
                      value={prompts[key.id] || ''}
                      onChange={(e) => setPrompts(prev => ({ ...prev, [key.id]: e.target.value }))}
                      className="w-full h-64 p-4 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono"
                      placeholder="Digite as instruções específicas para este tema/categoria... Deixe em branco para usar o prompt padrão do sistema."
                    />

                    {/* Character count */}
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {(prompts[key.id] || '').length} caracteres
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => handleSavePrompt(key.id)}
                        disabled={saving === key.id}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving === key.id ? 'Salvando...' : 'Salvar Prompt'}
                      </button>
                      {prompts[key.id]?.trim() && (
                        <button
                          onClick={() => handleResetPrompt(key.id)}
                          disabled={saving === key.id}
                          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          Limpar Prompt
                        </button>
                      )}
                    </div>
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
