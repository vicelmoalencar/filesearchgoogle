import { Suspense } from "react";
import type { Metadata } from "next";
import BlogContent from "./BlogContent";

export const metadata: Metadata = {
  title: "Blog | CCT AI File Search",
  description: "Artigos gerados automaticamente com base em documentos jurídicos e técnicos. Explore conteúdo sobre direito do trabalho, legislação e muito mais.",
  keywords: ["direito do trabalho", "legislação", "artigos jurídicos", "CCT", "convenção coletiva"],
  openGraph: {
    title: "Blog | CCT AI File Search",
    description: "Artigos gerados automaticamente com base em documentos jurídicos e técnicos.",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary",
    title: "Blog | CCT AI File Search",
    description: "Artigos jurídicos e técnicos gerados automaticamente.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    }>
      <BlogContent />
    </Suspense>
  );
}
