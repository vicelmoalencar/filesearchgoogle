"use client";

import { use, useState, useEffect } from "react";
import { ArrowLeft, Calendar, Tag, BookOpen, Share2, Check } from "lucide-react";
import Link from "next/link";
import MessageContent from "@/components/MessageContent";
import { useTheme } from "@/contexts/ThemeContext";

interface Article {
  id: string;
  title: string;
  topic: string;
  content: string;
  tags: string[];
  user_email: string;
  created_at: string;
  tone: string;
  length: string;
  structure: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const TONE_LABELS: Record<string, string> = {
  informativo: "Informativo",
  tecnico: "Técnico",
  jornalistico: "Jornalístico",
  academico: "Acadêmico",
};

const LENGTH_LABELS: Record<string, string> = {
  curto: "Curto (~300 palavras)",
  medio: "Médio (~600 palavras)",
  longo: "Longo (~1200 palavras)",
};

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/articles/${id}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setArticle(data.article);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail
    }
  };

  const descClass = isDark ? "text-gray-400" : "text-gray-500";

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="w-full py-4 bg-gray-900 border-b border-gray-700">
          <div className="max-w-3xl mx-auto px-4 flex justify-center">
            <img src="/assets/logo_suite.png" alt="Suite Plus" className="h-16 sm:h-20 w-auto" />
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-12 flex justify-center">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
        <div className="w-full py-4 bg-gray-900 border-b border-gray-700">
          <div className="max-w-3xl mx-auto px-4 flex justify-center">
            <img src="/assets/logo_suite.png" alt="Suite Plus" className="h-16 sm:h-20 w-auto" />
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <BookOpen className={`w-12 h-12 mx-auto mb-4 ${descClass}`} />
          <h1 className="text-xl font-bold mb-2">Artigo não encontrado</h1>
          <p className={`text-sm mb-6 ${descClass}`}>Este artigo não existe ou não está publicado.</p>
          <Link href="/blog" className="text-blue-400 hover:underline text-sm">
            Ver todos os artigos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Barra Suite Plus */}
      <div className="w-full py-4 bg-gray-900 border-b border-gray-700">
        <div className="max-w-3xl mx-auto px-4 flex justify-center">
          <a href="https://suiteplus.ensinoplus.com.br" title="Voltar para Suite Plus" className="hover:opacity-80 transition-opacity">
            <img src="/assets/logo_suite.png" alt="Suite Plus" className="h-16 sm:h-20 w-auto" />
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/blog"
            className={`flex items-center gap-2 text-sm transition-colors ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Todos os artigos
          </Link>
          <button
            onClick={handleShare}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isDark ? "hover:bg-white/5 text-gray-400 hover:text-white" : "hover:bg-gray-200 text-gray-600"
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
            {copied ? "Link copiado!" : "Compartilhar"}
          </button>
        </div>

        {/* Article meta */}
        <div className={`flex flex-wrap items-center gap-3 text-xs mb-4 ${descClass}`}>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(article.created_at)}
          </span>
          {article.tone && (
            <span className={`px-2 py-0.5 rounded-full ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
              {TONE_LABELS[article.tone] || article.tone}
            </span>
          )}
          {article.length && (
            <span className={`px-2 py-0.5 rounded-full ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
              {LENGTH_LABELS[article.length] || article.length}
            </span>
          )}
        </div>

        {/* Tags */}
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${
                  isDark
                    ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                <Tag className="w-3 h-3" />
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Article content */}
        <article className={`rounded-2xl border p-6 sm:p-8 ${isDark ? "bg-gray-800/60 border-gray-700/50" : "bg-white border-gray-200"}`}>
          <MessageContent text={article.content} role="model" theme={theme} />
        </article>

        {/* Footer */}
        <div className={`mt-8 pt-6 border-t ${isDark ? "border-white/10" : "border-gray-200"} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
          <p className={`text-xs ${descClass}`}>
            Gerado com base em documentos do sistema CCT
          </p>
          <Link
            href="/article"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-medium transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Gerar meu artigo
          </Link>
        </div>
      </div>
    </div>
  );
}
