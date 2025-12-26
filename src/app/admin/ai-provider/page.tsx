"use client";

import { useState, useEffect } from "react";
import { Settings, Plus, Trash2, Save, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import AdminRoute from "@/components/AdminRoute";

interface AIProvider {
  provider: 'google' | 'openrouter';
  apiKey: string;
}

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

export default function AIProviderPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [currentProvider, setCurrentProvider] = useState<'google' | 'openrouter'>('google');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');

  const [newModel, setNewModel] = useState({
    id: '',
    name: '',
    description: '',
    contextLength: 0,
    pricingPrompt: '',
    pricingCompletion: ''
  });
  const [showAddModel, setShowAddModel] = useState(false);

  // Modelos pré-configurados do OpenRouter
  const popularModels: OpenRouterModel[] = [
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      description: 'Most intelligent model, best for complex tasks',
      contextLength: 200000,
      pricing: { prompt: '$3/1M tokens', completion: '$15/1M tokens' }
    },
    {
      id: 'anthropic/claude-3-opus',
      name: 'Claude 3 Opus',
      description: 'Previous flagship model, very capable',
      contextLength: 200000,
      pricing: { prompt: '$15/1M tokens', completion: '$75/1M tokens' }
    },
    {
      id: 'anthropic/claude-3-haiku',
      name: 'Claude 3 Haiku',
      description: 'Fastest and most compact model',
      contextLength: 200000,
      pricing: { prompt: '$0.25/1M tokens', completion: '$1.25/1M tokens' }
    },
    {
      id: 'openai/gpt-4-turbo',
      name: 'GPT-4 Turbo',
      description: 'OpenAI\'s most capable model',
      contextLength: 128000,
      pricing: { prompt: '$10/1M tokens', completion: '$30/1M tokens' }
    },
    {
      id: 'openai/gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'Fast and affordable',
      contextLength: 16385,
      pricing: { prompt: '$0.5/1M tokens', completion: '$1.5/1M tokens' }
    },
    {
      id: 'google/gemini-pro-1.5',
      name: 'Gemini Pro 1.5',
      description: 'Google\'s advanced model via OpenRouter',
      contextLength: 1000000,
      pricing: { prompt: '$2.5/1M tokens', completion: '$10/1M tokens' }
    },
    {
      id: 'meta-llama/llama-3-70b-instruct',
      name: 'Llama 3 70B',
      description: 'Meta\'s open source model',
      contextLength: 8192,
      pricing: { prompt: '$0.59/1M tokens', completion: '$0.79/1M tokens' }
    }
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai-provider');
      const data = await response.json();

      if (data.provider) {
        setCurrentProvider(data.provider);
        setGoogleApiKey(data.googleApiKey || '');
        setOpenrouterApiKey(data.openrouterApiKey || '');
        setSelectedModel(data.selectedModel || '');
        setModels(data.customModels || []);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar configurações' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/ai-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: currentProvider,
          googleApiKey,
          openrouterApiKey,
          selectedModel: currentProvider === 'openrouter' ? selectedModel : undefined,
          customModels: models
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar configurações' });
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddModel = () => {
    if (!newModel.id || !newModel.name) {
      setMessage({ type: 'error', text: 'ID e Nome são obrigatórios' });
      return;
    }

    const model: OpenRouterModel = {
      id: newModel.id,
      name: newModel.name,
      description: newModel.description || undefined,
      contextLength: newModel.contextLength > 0 ? newModel.contextLength : undefined,
      pricing: (newModel.pricingPrompt || newModel.pricingCompletion) ? {
        prompt: newModel.pricingPrompt,
        completion: newModel.pricingCompletion
      } : undefined
    };

    setModels([...models, model]);
    setNewModel({
      id: '',
      name: '',
      description: '',
      contextLength: 0,
      pricingPrompt: '',
      pricingCompletion: ''
    });
    setShowAddModel(false);
    setMessage({ type: 'success', text: 'Modelo adicionado! Não esqueça de salvar.' });
  };

  const handleDeleteModel = (modelId: string) => {
    if (confirm('Tem certeza que deseja remover este modelo?')) {
      setModels(models.filter(m => m.id !== modelId));
      setMessage({ type: 'success', text: 'Modelo removido! Não esqueça de salvar.' });
    }
  };

  const handleAddPopularModel = (model: OpenRouterModel) => {
    if (models.find(m => m.id === model.id)) {
      setMessage({ type: 'error', text: 'Este modelo já foi adicionado' });
      return;
    }
    setModels([...models, model]);
    setMessage({ type: 'success', text: 'Modelo adicionado! Não esqueça de salvar.' });
  };

  const allModels = [...models, ...popularModels.filter(pm => !models.find(m => m.id === pm.id))];

  return (
    <AdminRoute>
      <div className="min-h-screen p-8 max-w-6xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                AI Provider Settings
              </h1>
              <p className="text-gray-400 mt-2">Configure qual provedor de IA usar</p>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <a href="/admin" className="text-sm text-blue-400 hover:text-blue-300 underline">
              ← Voltar para Admin
            </a>
          </div>
        </header>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            Carregando configurações...
          </div>
        ) : (
          <>
            {/* Provider Selection */}
            <div className="glass rounded-2xl p-6 mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">Provedor de IA</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCurrentProvider('google')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    currentProvider === 'google'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <h3 className="text-xl font-bold text-white mb-2">Google Gemini</h3>
                  <p className="text-sm text-gray-400">API oficial do Google com File Search</p>
                </button>

                <button
                  onClick={() => setCurrentProvider('openrouter')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    currentProvider === 'openrouter'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <h3 className="text-xl font-bold text-white mb-2">OpenRouter</h3>
                  <p className="text-sm text-gray-400">Acesso a múltiplos modelos (Claude, GPT-4, etc)</p>
                </button>
              </div>
            </div>

            {/* Google Settings */}
            {currentProvider === 'google' && (
              <div className="glass rounded-2xl p-6 mb-6">
                <h2 className="text-2xl font-bold text-white mb-4">Configurações Google Gemini</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Google API Key (atual do .env.local)
                    </label>
                    <input
                      type="password"
                      value={googleApiKey}
                      onChange={(e) => setGoogleApiKey(e.target.value)}
                      placeholder="AIza..."
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      A chave do Google está no arquivo .env.local. Este campo é apenas informativo.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* OpenRouter Settings */}
            {currentProvider === 'openrouter' && (
              <>
                <div className="glass rounded-2xl p-6 mb-6">
                  <h2 className="text-2xl font-bold text-white mb-4">Configurações OpenRouter</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        OpenRouter API Key *
                      </label>
                      <input
                        type="password"
                        value={openrouterApiKey}
                        onChange={(e) => setOpenrouterApiKey(e.target.value)}
                        placeholder="sk-or-v1-..."
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Obtenha sua chave em: <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">https://openrouter.ai/keys</a>
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Modelo Selecionado *
                      </label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        <option value="">Selecione um modelo...</option>
                        {allModels.map(model => (
                          <option key={model.id} value={model.id} className="bg-gray-900">
                            {model.name} - {model.id}
                          </option>
                        ))}
                      </select>
                      {selectedModel && (
                        <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                          {allModels.find(m => m.id === selectedModel)?.description && (
                            <p className="text-sm text-gray-300 mb-2">
                              {allModels.find(m => m.id === selectedModel)?.description}
                            </p>
                          )}
                          {allModels.find(m => m.id === selectedModel)?.contextLength && (
                            <p className="text-xs text-gray-400">
                              Context: {allModels.find(m => m.id === selectedModel)?.contextLength?.toLocaleString()} tokens
                            </p>
                          )}
                          {allModels.find(m => m.id === selectedModel)?.pricing && (
                            <p className="text-xs text-gray-400">
                              Pricing: {allModels.find(m => m.id === selectedModel)?.pricing?.prompt} / {allModels.find(m => m.id === selectedModel)?.pricing?.completion}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Models Management */}
                <div className="glass rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Modelos Disponíveis</h2>
                    <button
                      onClick={() => setShowAddModel(!showAddModel)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Modelo Customizado
                    </button>
                  </div>

                  {showAddModel && (
                    <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
                      <h3 className="text-lg font-semibold text-white mb-4">Novo Modelo Customizado</h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm text-gray-300 mb-2">ID do Modelo *</label>
                          <input
                            type="text"
                            value={newModel.id}
                            onChange={(e) => setNewModel({...newModel, id: e.target.value})}
                            placeholder="ex: anthropic/claude-3.5-sonnet"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-300 mb-2">Nome *</label>
                          <input
                            type="text"
                            value={newModel.name}
                            onChange={(e) => setNewModel({...newModel, name: e.target.value})}
                            placeholder="ex: Claude 3.5 Sonnet"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm text-gray-300 mb-2">Descrição</label>
                        <input
                          type="text"
                          value={newModel.description}
                          onChange={(e) => setNewModel({...newModel, description: e.target.value})}
                          placeholder="Descrição do modelo"
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm text-gray-300 mb-2">Context Length</label>
                          <input
                            type="number"
                            value={newModel.contextLength}
                            onChange={(e) => setNewModel({...newModel, contextLength: parseInt(e.target.value) || 0})}
                            placeholder="200000"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-300 mb-2">Preço Prompt</label>
                          <input
                            type="text"
                            value={newModel.pricingPrompt}
                            onChange={(e) => setNewModel({...newModel, pricingPrompt: e.target.value})}
                            placeholder="$3/1M tokens"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-300 mb-2">Preço Completion</label>
                          <input
                            type="text"
                            value={newModel.pricingCompletion}
                            onChange={(e) => setNewModel({...newModel, pricingCompletion: e.target.value})}
                            placeholder="$15/1M tokens"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddModel}
                          className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 transition-colors"
                        >
                          Adicionar
                        </button>
                        <button
                          onClick={() => setShowAddModel(false)}
                          className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Popular Models */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Modelos Populares</h3>
                    <div className="grid gap-3">
                      {popularModels.filter(pm => !models.find(m => m.id === pm.id)).map(model => (
                        <div key={model.id} className="p-4 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-white">{model.name}</h4>
                            <p className="text-sm text-gray-400">{model.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {model.id} • {model.contextLength?.toLocaleString()} tokens
                              {model.pricing && ` • ${model.pricing.prompt} / ${model.pricing.completion}`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddPopularModel(model)}
                            className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors text-sm"
                          >
                            Adicionar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom Models */}
                  {models.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Modelos Customizados</h3>
                      <div className="grid gap-3">
                        {models.map(model => (
                          <div key={model.id} className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30 flex justify-between items-center">
                            <div>
                              <h4 className="font-semibold text-white">{model.name}</h4>
                              {model.description && <p className="text-sm text-gray-400">{model.description}</p>}
                              <p className="text-xs text-gray-500 mt-1">
                                {model.id}
                                {model.contextLength && ` • ${model.contextLength.toLocaleString()} tokens`}
                                {model.pricing && ` • ${model.pricing.prompt} / ${model.pricing.completion}`}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteModel(model.id)}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors font-medium"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salvar Configurações
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </AdminRoute>
  );
}
