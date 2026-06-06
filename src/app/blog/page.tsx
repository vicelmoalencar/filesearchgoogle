"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Tag, Calendar, ChevronLeft, ChevronRight, Search, FileText } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";

interface ArticleSummary {
  id: string;
  title: string;
  topic: string;
  tags: string[];
  user_email: string;
  created_at: string;
  tone: string;
  length: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  return `${user.slice(0, 2)}***@${domain}`;
}

const TONE_LABELS: Record<string, string> = {
  informativo: "Informativo",
  tecnico: "Técnico",
  jornalistico: "Jornalístico",
  academico: "Acadêmico",
};

export default function BlogPage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTag, setSearchTag] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const searchParams = useSearchParams();

  const LIMIT = 12;
  const totalPages = Math.ceil(total / LIMIT);

  const fetchArticles = useCallback(async (p: number, tag: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (tag) params.set("tag", tag);
      const res = await fetch(`/api/articles?${params}`);
      const data = await res.json();
      setArticles(data.articles || []);
      setTotal(data.total || 0);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tag = searchParams.get("tag");
    setActiveTag(tag);
    setPage(1);
    fetchArticles(1, tag);
  }, [searchParams, fetchArticles]);

  const handleTagClick = (tag: string) => {
    const next = activeTag === tag ? null : tag;
    setActiveTag(next);
    setPage(1);
    fetchArticles(1, next);
    window.history.replaceState(null, "", next ? `/blog?tag=${encodeURIComponent(next)}` : "/blog");
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchArticles(p, activeTag);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cardClass = isDark ? "bg-gray-800/60 border-gray-700/50 hover:border-gray-600" : "bg-white border-gray-200 hover:border-gray-300";
  const descClass = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Barra Suite Plus */}
      <div className="w-full py-4 bg-gray-900 border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-4 flex justify-center">
          <a href="https://suiteplus.ensinoplus.com.br" title="Voltar para Suite Plus" className="hover:opacity-80 transition-opacity">
            <img src="/assets/logo_suite.png" alt="Suite Plus" className="h-16 sm:h-20 w-auto" />
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-500">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Blog</h1>
              <p className={`text-sm ${descClass}`}>
                {total > 0 ? `${total} artigo${total !== 1 ? "s" : ""} publicado${total !== 1 ? "s" : ""}` : "Artigos gerados pelos usuários"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/article"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-medium transition-all shadow-lg"
            >
              <FileText className="w-4 h-4" />
              Gerar artigo
            </Link>
            <Link
              href="/"
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? "hover:bg-white/5 text-gray-400" : "hover:bg-gray-200 text-gray-600"}`}
            >
              Chat
            </Link>
          </div>
        </div>

        {/* Tag filter */}
        {activeTag && (
          <div className="flex items-center gap-2 mb-6">
            <Tag className={`w-4 h-4 ${descClass}`} />
            <span className={`text-sm ${descClass}`}>Filtrando por:</span>
            <button
              onClick={() => handleTagClick(activeTag)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
            >
              {activeTag}
              <span className="text-blue-300">×</span>
            </button>
          </div>
        )}

        {/* Articles grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-5 animate-pulse ${isDark ? "bg-gray-800/40 border-gray-700/50" : "bg-gray-100 border-gray-200"}`}
              >
                <div className={`h-4 rounded mb-3 w-3/4 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                <div className={`h-3 rounded mb-2 w-full ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                <div className={`h-3 rounded mb-4 w-2/3 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                <div className="flex gap-2">
                  <div className={`h-5 rounded-full w-16 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                  <div className={`h-5 rounded-full w-20 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className={`rounded-2xl border p-12 flex flex-col items-center justify-center text-center ${isDark ? "bg-gray-800/40 border-gray-700/50" : "bg-white border-gray-200"}`}>
            <BookOpen className={`w-12 h-12 mb-4 ${descClass}`} />
            <p className={`text-lg font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              {activeTag ? `Nenhum artigo com a tag "${activeTag}"` : "Nenhum artigo publicado ainda"}
            </p>
            <p className={`text-sm ${descClass}`}>
              {activeTag ? "Tente outra tag ou" : ""}{" "}
              <Link href="/article" className="text-blue-400 hover:underline">
                gere o primeiro artigo
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((art) => (
              <Link
                key={art.id}
                href={`/blog/${art.id}`}
                className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all ${cardClass} group`}
              >
                <div className="flex-1 min-w-0">
                  <h2 className={`font-semibold text-sm leading-snug mb-1.5 group-hover:text-blue-400 transition-colors line-clamp-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                    {art.title || art.topic}
                  </h2>
                  <p className={`text-xs line-clamp-2 ${descClass}`}>{art.topic}</p>
                </div>

                {/* Tags */}
                {art.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {art.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        onClick={(e) => { e.preventDefault(); handleTagClick(tag); }}
                        className={`text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                          activeTag === tag
                            ? "bg-blue-500 text-white"
                            : isDark
                            ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                    {art.tags.length > 3 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-500"}`}>
                        +{art.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Meta */}
                <div className={`flex items-center justify-between text-xs ${descClass}`}>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(art.created_at)}
                  </span>
                  {art.tone && (
                    <span className={`px-2 py-0.5 rounded-full ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                      {TONE_LABELS[art.tone] || art.tone}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${isDark ? "hover:bg-white/5 text-gray-400" : "hover:bg-gray-200 text-gray-600"}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? "bg-blue-500 text-white"
                    : isDark
                    ? "hover:bg-white/5 text-gray-400"
                    : "hover:bg-gray-200 text-gray-600"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${isDark ? "hover:bg-white/5 text-gray-400" : "hover:bg-gray-200 text-gray-600"}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
