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
  const [editingPrompts, setEditingPrompts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
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
        // Inicializar editingPrompts com os prompts atuais
        const prompts: Record<string, string> = {};
        data.keys.forEach((key: ApiKey) => {
          prompts[key.id] = key.customPrompt || '';
        });
        setEditingPrompts(prompts);
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

  const handleSaveKeyPrompt = async (keyId: string) => {
    setSavingKey(keyId);
    setMessage(null);

    try {
      const prompt = editingPrompts[keyId];

      const response = await fetch('/api/key-prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyId, prompt }),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Prompt customizado salvo com sucesso!'
        });
        // Recarregar chaves para atualizar a visualização
        await loadKeys();
      } else {
        const data = await response.json();
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao salvar prompt customizado'
        });
      }
    } catch (error) {
      console.error('Erro ao salvar prompt customizado:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar prompt customizado' });
    } finally {
      setSavingKey(null);
    }
  };

  const handleDeleteKeyPrompt = async (keyId: string) => {
    if (!confirm('Deseja realmente remover o prompt customizado? A chave voltará a usar o prompt padrão do sistema.')) {
      return;
    }

    setSavingKey(keyId);
    setMessage(null);

    try {
      const response = await fetch(`/api/key-prompts?keyId=${keyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Prompt customizado removido com sucesso!'
        });
        // Atualizar estado local
        setEditingPrompts(prev => ({
          ...prev,
          [keyId]: ''
        }));
        // Recarregar chaves
        await loadKeys();
      } else {
        const data = await response.json();
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao remover prompt customizado'
        });
      }
    } catch (error) {
      console.error('Erro ao remover prompt customizado:', error);
      setMessage({ type: 'error', text: 'Erro ao remover prompt customizado' });
    } finally {
      setSavingKey(null);
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
            Cada chave de API pode ter seu próprio prompt customizado. Os prompts são armazenados em arquivos editáveis e podem ser configurados diretamente nesta interface.
          </p>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li>Se uma chave não tiver prompt customizado, ela usará o <strong>Prompt Padrão do Sistema</strong></li>
            <li>Os prompts customizados são salvos em <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded">data/key-prompts.json</code></li>
            <li>As alterações são aplicadas imediatamente no chat</li>
          </ul>
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
                          {key.customPrompt?.trim() ? '✓ Prompt Customizado' : '○ Usando Prompt Padrão'}
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
                      Prompt Customizado para {key.name}
                    </label>

                    <textarea
                      value={editingPrompts[key.id] || ''}
                      onChange={(e) => setEditingPrompts(prev => ({
                        ...prev,
                        [key.id]: e.target.value
                      }))}
                      className="w-full h-64 p-4 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono"
                      placeholder="Digite o prompt customizado para esta chave ou deixe vazio para usar o prompt padrão do sistema..."
                    />

                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {(editingPrompts[key.id] || '').length} caracteres
                      </div>

                      <div className="flex gap-2">
                        {key.customPrompt?.trim() && (
                          <button
                            onClick={() => handleDeleteKeyPrompt(key.id)}
                            disabled={savingKey === key.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
                          >
                            {savingKey === key.id ? 'Removendo...' : 'Remover Prompt'}
                          </button>
                        )}

                        <button
                          onClick={() => handleSaveKeyPrompt(key.id)}
                          disabled={savingKey === key.id || !(editingPrompts[key.id]?.trim())}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {savingKey === key.id ? 'Salvando...' : 'Salvar Prompt'}
                        </button>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      {editingPrompts[key.id]?.trim()
                        ? 'Este prompt será usado especificamente para esta chave de API.'
                        : 'Sem prompt customizado, esta chave usará o prompt padrão do sistema.'}
                    </p>
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
