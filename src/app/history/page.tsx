'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useTheme } from '@/components/ThemeContext';
import { Search, Filter, ChevronLeft, ChevronRight, Calendar, Bot, User, DollarSign, MessageSquare } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

interface ChatHistoryItem {
  id: number;
  user_id: string;
  platform: string;
  model: string;
  prompt: string;
  response: string;
  input_tokens: number;
  output_tokens: number;
  audio_input_tokens: number;
  audio_output_tokens: number;
  total_tokens: number;
  input_cost_brl: string;
  output_cost_brl: string;
  audio_input_cost_brl: string;
  audio_output_cost_brl: string;
  total_cost_brl: string;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

function HistoryPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [items, setItems] = useState<ChatHistoryItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Item expandido
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const fetchHistory = async (page: number = 1) => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      });

      if (search) params.append('search', search);
      if (selectedModel) params.append('model', selectedModel);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/chat-history?${params}`, {
        headers: {
          'Authorization': `Bearer ${(await user.getSession()).access_token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setItems(result.data.items);
        setPagination(result.data.pagination);
        setAvailableModels(result.data.filters.availableModels);
      } else {
        setError(result.error || 'Erro ao carregar histórico');
      }
    } catch (err: any) {
      setError('Erro ao carregar histórico: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleSearch = () => {
    fetchHistory(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedModel('');
    setStartDate('');
    setEndDate('');
    fetchHistory(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCost = (cost: string) => {
    return parseFloat(cost).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Histórico de Conversas</h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Visualize e pesquise todo o histórico de interações com a IA
          </p>
        </div>

        {/* Filtros */}
        <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Search className="w-5 h-5" />
              Busca e Filtros
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1 rounded-md text-sm ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              <Filter className="w-4 h-4 inline mr-1" />
              {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
            </button>
          </div>

          {/* Barra de busca principal */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar em perguntas e respostas..."
              className={`flex-1 px-4 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Buscar
            </button>
          </div>

          {/* Filtros avançados */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Bot className="w-4 h-4 inline mr-1" />
                  Modelo
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">Todos os modelos</option>
                  {availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data Final
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>
          )}

          {showFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleClearFilters}
                className={`px-4 py-2 rounded-md text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </div>

        {/* Status */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Tabela de Histórico */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Carregando histórico...</p>
          </div>
        ) : items.length === 0 ? (
          <div className={`text-center py-12 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className={`rounded-lg shadow-md overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Data/Hora</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Modelo</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Pergunta</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Resposta</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Tokens</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Custo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={`${
                        theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
                      } transition-colors cursor-pointer`}
                      onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                    >
                      <td className="px-4 py-3 text-sm">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.model}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 mt-1 flex-shrink-0 text-gray-400" />
                          <span className={expandedItem === item.id ? '' : 'line-clamp-2'}>
                            {expandedItem === item.id ? item.prompt : truncateText(item.prompt, 80)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-start gap-2">
                          <Bot className="w-4 h-4 mt-1 flex-shrink-0 text-gray-400" />
                          <span className={expandedItem === item.id ? '' : 'line-clamp-2'}>
                            {expandedItem === item.id ? item.response : truncateText(item.response, 80)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="text-xs text-gray-500">
                          <div>In: {item.input_tokens.toLocaleString()}</div>
                          <div>Out: {item.output_tokens.toLocaleString()}</div>
                          <div className="font-semibold mt-1">Total: {item.total_tokens.toLocaleString()}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        {formatCost(item.total_cost_brl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className={`px-4 py-3 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                  {pagination.total} registros
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchHistory(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className={`px-3 py-1 rounded-md flex items-center gap-1 ${
                      pagination.hasPrev
                        ? theme === 'dark'
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>

                  <span className="text-sm">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>

                  <button
                    onClick={() => fetchHistory(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className={`px-3 py-1 rounded-md flex items-center gap-1 ${
                      pagination.hasNext
                        ? theme === 'dark'
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resumo de custos */}
        {items.length > 0 && (
          <div className={`mt-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Resumo da Página Atual
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total de Registros</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total de Tokens</p>
                <p className="text-2xl font-bold">
                  {items.reduce((acc, item) => acc + item.total_tokens, 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Custo Total</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCost(
                    items.reduce((acc, item) => acc + parseFloat(item.total_cost_brl), 0).toFixed(6)
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Custo Médio</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCost(
                    (items.reduce((acc, item) => acc + parseFloat(item.total_cost_brl), 0) / items.length).toFixed(6)
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function History() {
  return (
    <ProtectedRoute>
      <HistoryPage />
    </ProtectedRoute>
  );
}
