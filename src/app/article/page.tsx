
"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Sparkles, Sun, Moon, LogOut, Copy, Download, ArrowLeft, Check, Loader2 } from "lucide-react";
import MessageContent from "@/components/MessageContent";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import CreditsDisplay from "@/components/CreditsDisplay";

interface ApiKey {
  id: string;
  name: string;
  theme: string;
}

const TONE_OPTIONS = [
  { value: "informativo", label: "Informativo", description: "Claro e acessível ao público geral" },
  { value: "tecnico", label: "Técnico", description: "Preciso, voltado para profissionais" },
  { value: "jornalistico", label: "Jornalístico", description: "Objetivo e com linguagem direta" },
  { value: "academico", label: "Acadêmico", description: "Formal e referenciado" },
];

const LENGTH_OPTIONS = [
  { value: "curto", label: "Curto", description: "~300 palavras" },
  { value: "medio", label: "Médio", description: "~600 palavras" },
  { value: "longo", label: "Longo", description: "~1200 palavras" },
];

const STRUCTURE_OPTIONS = [
  { value: "completo", label: "Artigo completo", description: "Introdução, desenvolvimento com subtópicos e conclusão" },
  { value: "resumo", label: "Resumo executivo", description: "Resumo e pontos principais em lista" },
  { value: "opiniao", label: "Artigo de opinião", description: "Contexto, argumento central e evidências" },
];

export default function ArticlePage() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("informativo");
  const [length, setLength] = useState("medio");
  const [structure, setStructure] = useState("completo");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);

  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  const isDark = theme === "dark";

  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        const response = await fetch("/api/api-keys");
        const data = await response.json();
        if (data.keys && data.keys.length > 0) {
          setApiKeys(data.keys);
          setSelectedKeyId(data.keys[0].id);
        }
      } catch {
        // silently fail
      }
    };
    loadApiKeys();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    setArticle("");
    setError("");

    try {
      const res = await fetch("/api/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), tone, length, structure, apiKeyId: selectedKeyId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao gerar artigo.");
      } else {
        setArticle(data.article);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(article);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([article], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artigo-${topic.slice(0, 40).replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cardClass = isDark
    ? "bg-gray-800/60 border-gray-700/50"
    : "bg-white border-gray-200";

  const inputClass = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:ring-blue-500/50 focus:border-blue-500/50"
    : "bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-blue-500/50 focus:border-blue-500/50";

  const labelClass = isDark ? "text-gray-300" : "text-gray-700";
  const descClass = isDark ? "text-gray-500" : "text-gray-500";

  return (
    <ProtectedRoute>
      <div className={`min-h-screen ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
        {/* Barra do logo Suite Plus */}
        <div className="w-full py-4 bg-gray-900 border-b border-gray-700">
          <div className="max-w-5xl mx-auto px-4 flex justify-center">
            <a href="https://suiteplus.ensinoplus.com.br" title="Voltar para Suite Plus" className="hover:opacity-80 transition-opacity">
              <img src="/assets/logo_suite.png" alt="Suite Plus" className="h-16 sm:h-20 w-auto" />
            </a>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Header */}
          <header className={`flex justify-between items-center pb-4 mb-6 border-b ${isDark ? "border-white/10" : "border-gray-200"}`}>
            <div className="flex items-center gap-3">
              <a
                href="/"
                className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-white/5 text-gray-400" : "hover:bg-gray-200 text-gray-600"}`}
                title="Voltar ao chat"
              >
                <ArrowLeft className="w-5 h-5" />
              </a>
              <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-500">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Gerador de Artigos</h1>
                <p className={`text-xs ${descClass}`}>Baseado exclusivamente nos documentos carregados</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CreditsDisplay />
              {apiKeys.length > 0 && (
                <select
                  value={selectedKeyId}
                  onChange={(e) => setSelectedKeyId(e.target.value)}
                  style={isDark ? { colorScheme: "dark", background: "rgba(255,255,255,0.05)", color: "white" } : undefined}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                    isDark
                      ? "bg-white/5 border-white/10 text-white hover:bg-white/10 [&>option]:bg-gray-800 [&>option]:text-white"
                      : "bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {apiKeys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.theme} - {key.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-white/5 text-gray-400" : "hover:bg-gray-200 text-gray-600"}`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={signOut}
                className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-white/5 text-gray-400 hover:text-red-400" : "hover:bg-gray-200 text-gray-600 hover:text-red-600"}`}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Form */}
            <form onSubmit={handleGenerate} className="lg:col-span-2 space-y-5">
              {/* Topic */}
              <div className={`p-5 rounded-2xl border backdrop-blur-sm ${cardClass}`}>
                <label className={`block text-sm font-semibold mb-2 ${labelClass}`}>
                  Tema do artigo *
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: Regulamentação do trabalho intermitente, Reforma trabalhista de 2017..."
                  rows={3}
                  className={`w-full rounded-xl px-4 py-3 text-sm border transition-all resize-none focus:outline-none focus:ring-2 ${inputClass}`}
                  disabled={loading}
                />
              </div>

              {/* Tone */}
              <div className={`p-5 rounded-2xl border backdrop-blur-sm ${cardClass}`}>
                <label className={`block text-sm font-semibold mb-3 ${labelClass}`}>Tom</label>
                <div className="space-y-2">
                  {TONE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${
                        tone === opt.value
                          ? "border-blue-500 bg-blue-500/10"
                          : isDark
                          ? "border-transparent hover:bg-white/5"
                          : "border-transparent hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tone"
                        value={opt.value}
                        checked={tone === opt.value}
                        onChange={() => setTone(opt.value)}
                        className="mt-0.5 accent-blue-500"
                        disabled={loading}
                      />
                      <div>
                        <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{opt.label}</div>
                        <div className={`text-xs ${descClass}`}>{opt.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Length */}
              <div className={`p-5 rounded-2xl border backdrop-blur-sm ${cardClass}`}>
                <label className={`block text-sm font-semibold mb-3 ${labelClass}`}>Extensão</label>
                <div className="flex gap-2">
                  {LENGTH_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLength(opt.value)}
                      disabled={loading}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors border ${
                        length === opt.value
                          ? "border-blue-500 bg-blue-500/20 text-blue-400"
                          : isDark
                          ? "border-white/10 text-gray-400 hover:bg-white/5"
                          : "border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <div className="font-semibold">{opt.label}</div>
                      <div className={`text-xs mt-0.5 ${descClass}`}>{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Structure */}
              <div className={`p-5 rounded-2xl border backdrop-blur-sm ${cardClass}`}>
                <label className={`block text-sm font-semibold mb-3 ${labelClass}`}>Estrutura</label>
                <div className="space-y-2">
                  {STRUCTURE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${
                        structure === opt.value
                          ? "border-blue-500 bg-blue-500/10"
                          : isDark
                          ? "border-transparent hover:bg-white/5"
                          : "border-transparent hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="radio"
                        name="structure"
                        value={opt.value}
                        checked={structure === opt.value}
                        onChange={() => setStructure(opt.value)}
                        className="mt-0.5 accent-blue-500"
                        disabled={loading}
                      />
                      <div>
                        <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{opt.label}</div>
                        <div className={`text-xs ${descClass}`}>{opt.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!topic.trim() || loading}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando artigo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Gerar Artigo
                  </>
                )}
              </button>

              <p className={`text-xs text-center ${descClass}`}>
                O artigo será gerado exclusivamente com base nos documentos carregados no sistema.
              </p>
            </form>

            {/* Article Output */}
            <div className="lg:col-span-3">
              {!article && !error && !loading && (
                <div className={`h-full min-h-64 rounded-2xl border flex flex-col items-center justify-center text-center p-8 ${cardClass}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                    <FileText className={`w-8 h-8 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                  </div>
                  <p className={`text-lg font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>Seu artigo aparecerá aqui</p>
                  <p className={`text-sm max-w-xs ${descClass}`}>
                    Preencha o tema e as opções ao lado, depois clique em &quot;Gerar Artigo&quot;.
                  </p>
                </div>
              )}

              {loading && (
                <div className={`h-full min-h-64 rounded-2xl border flex flex-col items-center justify-center text-center p-8 ${cardClass}`}>
                  <div className="flex gap-1 mb-4">
                    <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Consultando os documentos...</p>
                  <p className={`text-sm mt-1 ${descClass}`}>Isso pode levar alguns segundos</p>
                </div>
              )}

              {error && (
                <div className={`rounded-2xl border p-6 ${isDark ? "bg-red-900/20 border-red-700/50" : "bg-red-50 border-red-200"}`}>
                  <p className={`font-semibold mb-1 ${isDark ? "text-red-400" : "text-red-700"}`}>Erro ao gerar artigo</p>
                  <p className={`text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>{error}</p>
                </div>
              )}

              {article && (
                <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
                  {/* Action bar */}
                  <div className={`flex items-center justify-between px-5 py-3 border-b ${isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}>
                    <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Artigo gerado</span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopy}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isDark ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-200 text-gray-600"
                        }`}
                        title="Copiar para área de transferência"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copiado!" : "Copiar"}
                      </button>
                      <button
                        onClick={handleDownload}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isDark ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-200 text-gray-600"
                        }`}
                        title="Baixar como Markdown"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar .md
                      </button>
                    </div>
                  </div>

                  {/* Article content */}
                  <div ref={articleRef} className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    <MessageContent text={article} role="model" theme={theme} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
