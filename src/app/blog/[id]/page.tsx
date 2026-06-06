import type { Metadata } from "next";
import { getArticleById } from "@/lib/articles-storage";
import ArticleView from "@/app/blog/ArticleView";

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim();
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) {
    return {
      title: "Artigo não encontrado | Blog CCT",
      robots: { index: false, follow: false },
    };
  }

  const description = stripMarkdown(article.content).slice(0, 160);
  const title = `${article.title} | Blog CCT`;

  return {
    title,
    description,
    keywords: article.tags,
    openGraph: {
      title: article.title,
      description,
      type: "article",
      publishedTime: article.created_at,
      tags: article.tags,
      locale: "pt_BR",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
    },
    robots: { index: true, follow: true },
    alternates: { canonical: `/blog/${id}` },
  };
}

export default async function ArticleDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const article = await getArticleById(id);

  const jsonLd = article
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: stripMarkdown(article.content).slice(0, 200),
        datePublished: article.created_at,
        dateModified: article.updated_at || article.created_at,
        keywords: article.tags?.join(", "),
        author: {
          "@type": "Organization",
          name: "CCT AI File Search",
        },
        publisher: {
          "@type": "Organization",
          name: "Ensino Plus",
        },
        inLanguage: "pt-BR",
        about: article.topic,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ArticleView id={id} />
    </>
  );
}
