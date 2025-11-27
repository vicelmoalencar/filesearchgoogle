'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PromptSettingsPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Carregar o prompt atual
    fetch('/api/prompt')
      .then(res => res.json())
      .then(data => {
        if (data.prompt) {
          setPrompt(data.prompt);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar prompt:', err);
        setMessage({ type: 'error', text: 'Erro ao carregar prompt' });
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Prompt atualizado com sucesso!' });
      } else {
        const errorMessage = data.error || 'Erro ao salvar prompt';
        const errorDetails = data.details ? `\n\n${data.details}` : '';
        setMessage({ type: 'error', text: errorMessage + errorDetails });
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar prompt' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Deseja realmente restaurar o prompt padrão?')) {
      fetch('/api/prompt/reset', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data.prompt) {
            setPrompt(data.prompt);
            setMessage({ type: 'success', text: 'Prompt restaurado para o padrão' });
          }
        })
        .catch(err => {
          console.error('Erro ao restaurar prompt:', err);
          setMessage({ type: 'error', text: 'Erro ao restaurar prompt' });
        });
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
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 flex items-center gap-2"
          >
            ← Voltar para Admin
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Configuração do Prompt do Sistema
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Personalize as instruções que o modelo de IA segue ao responder perguntas
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
            <pre className="whitespace-pre-wrap font-sans">{message.text}</pre>
          </div>
        )}

        {/* Prompt Editor */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Prompt do Sistema
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-96 p-4 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono"
            placeholder="Digite as instruções do sistema..."
          />

          {/* Character count */}
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {prompt.length} caracteres
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <button
              onClick={handleReset}
              disabled={saving}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Restaurar Padrão
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
            💡 Dicas para um bom prompt:
          </h3>
          <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>Seja claro e específico sobre o comportamento esperado</li>
            <li>Defina o tom e estilo de resposta (formal, técnico, etc.)</li>
            <li>Especifique limites e restrições (o que NÃO fazer)</li>
            <li>Inclua exemplos quando apropriado</li>
            <li>Mantenha as instruções organizadas e fáceis de ler</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
