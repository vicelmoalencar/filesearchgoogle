
"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Paperclip, Sparkles, Sun, Moon, LogOut, BarChart3 } from "lucide-react";
import MessageContent from "@/components/MessageContent";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import CreditsDisplay from "@/components/CreditsDisplay";

interface Message {
  role: "user" | "model";
  text: string;
}

interface ApiKey {
  id: string;
  name: string;
  theme: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { signOut, user, isAdmin } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar chaves de API disponíveis
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        const response = await fetch('/api/api-keys');
        const data = await response.json();
        if (data.keys && data.keys.length > 0) {
          setApiKeys(data.keys);
          setSelectedKeyId(data.keys[0].id);
        }
      } catch (error) {
        console.error('Erro ao carregar chaves:', error);
      }
    };
    loadApiKeys();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      // Obter token de autenticação do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      console.log('[Debug] Auth token:', authToken ? 'Present' : 'Missing');

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken && { "Authorization": `Bearer ${authToken}` })
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          })),
          apiKeyId: selectedKeyId
        }),
      });

      const data = await res.json();

      if (data.response) {
        setMessages((prev) => [...prev, { role: "model", text: data.response }]);
      } else if (data.error) {
        // Verificar se é erro de créditos insuficientes
        if (res.status === 403) {
          setMessages((prev) => [...prev, {
            role: "model",
            text: `❌ ${data.error}\n\nSeu saldo atual: ${data.credits || 0} créditos.\n\nPara continuar usando o sistema, você precisa recarregar seus créditos.`
          }]);
        } else {
          setMessages((prev) => [...prev, { role: "model", text: `Erro: ${data.error}` }]);
        }
      } else {
        setMessages((prev) => [...prev, { role: "model", text: "Sorry, I encountered an error." }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { role: "model", text: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
      <header className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 py-4 mb-4 border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-300'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-500">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-lg sm:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Chat CCT</h1>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Desenvolvido por Ensino Plus</p>
            </div>
          </div>

          {apiKeys.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className={`text-sm whitespace-nowrap ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Chat:
              </label>
              <select
                value={selectedKeyId}
                onChange={(e) => {
                  setSelectedKeyId(e.target.value);
                  setMessages([]);
                }}
                style={theme === 'dark' ? {
                  colorScheme: 'dark',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white'
                } : undefined}
                className={`flex-1 sm:flex-initial px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-white hover:bg-white/10 [&>option]:bg-gray-800 [&>option]:text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200 [&>option]:bg-white [&>option]:text-gray-900'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
              >
                {apiKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.theme} - {key.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Exibir créditos */}
          <CreditsDisplay />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {isAdmin && (
            <>
              <a
                href="/admin"
                className={`text-xs sm:text-sm transition-colors flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
              >
                <Paperclip className="w-4 h-4" />
                <span className="hidden sm:inline">Manage Files</span>
                <span className="sm:hidden">Files</span>
              </a>
              <a
                href="/usage"
                className={`text-xs sm:text-sm transition-colors flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Usage</span>
              </a>
            </>
          )}
          <button
            onClick={signOut}
            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-gray-400 hover:text-red-400' : 'hover:bg-gray-200 text-gray-600 hover:text-red-600'}`}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar mb-4">
        {messages.length === 0 && (
          <div className={`h-full flex flex-col items-center justify-center text-center space-y-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-2 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-200'}`}>
              <Bot className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className={`text-xl font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Como posso ajudá-lo hoje?</h2>
            <p className="max-w-md">
              Estou aqui para responder suas perguntas com base em uma vasta biblioteca de documentos.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-2 sm:gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"
              }`}
          >
            {msg.role === "model" && (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[80%] p-4 sm:p-5 rounded-2xl ${msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-none shadow-lg"
                  : theme === 'dark'
                    ? "bg-gray-800/90 backdrop-blur-sm text-gray-100 rounded-tl-none shadow-xl border border-gray-700/50"
                    : "bg-white backdrop-blur-sm text-gray-900 rounded-tl-none shadow-xl border border-gray-300"
                }`}
            >
              <MessageContent text={msg.text} role={msg.role} theme={theme} />
            </div>

            {msg.role === "user" && (
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}>
                <User className={`w-4 h-4 sm:w-5 sm:h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className={`backdrop-blur-sm p-4 rounded-2xl rounded-tl-none shadow-xl flex items-center gap-3 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white border-gray-300'} border`}>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Consultando as fontes...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte algo sobre seus arquivos..."
          className={`w-full rounded-2xl pl-6 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'} border`}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="absolute right-3 top-3 p-2 bg-blue-600 rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </form>
    </div>
    </ProtectedRoute>
  );
}
