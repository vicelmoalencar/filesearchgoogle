import React from 'react';

interface MessageContentProps {
  text: string;
  role: 'user' | 'model';
  theme?: 'light' | 'dark';
}

export default function MessageContent({ text, role, theme = 'dark' }: MessageContentProps) {
  // Process markdown links [text](url), images ![alt](url), bold text **text**, and auto-detect URLs
  const processInlineFormatting = (line: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    // Combined regex to match both images and links in order
    const combinedRegex = /(!?\[([^\]]*)\]\(([^)]+)\))/g;

    while ((match = combinedRegex.exec(line)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const beforeText = line.substring(lastIndex, match.index);
        parts.push(...processBoldAndUrls(beforeText, parts.length));
      }

      // Check if it's an image (starts with !)
      if (match[0].startsWith('!')) {
        const altText = match[2];
        const imageUrl = match[3];
        parts.push(
          <img
            key={parts.length}
            src={imageUrl}
            alt={altText || 'Imagem'}
            className="max-w-full h-auto rounded-lg my-2 shadow-lg"
            loading="lazy"
          />
        );
      } else {
        // It's a regular link - check if it's a video URL
        const linkText = match[2];
        const linkUrl = match[3];

        // Check if the link is a video (YouTube or Vimeo)
        const videoEmbed = getVideoEmbed(linkUrl);

        if (videoEmbed) {
          // Display video player instead of link
          parts.push(
            <React.Fragment key={parts.length}>
              {videoEmbed}
            </React.Fragment>
          );
        } else {
          // Regular text link
          parts.push(
            <a
              key={parts.length}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              {linkText}
            </a>
          );
        }
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last match
    if (lastIndex < line.length) {
      const remainingText = line.substring(lastIndex);
      parts.push(...processBoldAndUrls(remainingText, parts.length));
    }

    return parts.length > 0 ? parts : processBoldAndUrls(line, 0);
  };

  // Process bold text, HTML img tags, and auto-detect plain URLs
  const processBoldAndUrls = (text: string, keyOffset: number): React.ReactNode[] => {
    // First check for HTML img tags
    const imgTagRegex = /<img\s+([^>]*src=["']([^"']+)["'][^>]*)>/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = imgTagRegex.exec(text)) !== null) {
      // Add text before the image
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        parts.push(...processBoldAndUrlsOnly(beforeText, keyOffset + parts.length));
      }

      // Extract attributes
      const imgSrc = match[2];
      const altMatch = match[1].match(/alt=["']([^"']+)["']/i);
      const altText = altMatch ? altMatch[1] : 'Imagem';

      parts.push(
        <img
          key={`${keyOffset}-img-${parts.length}`}
          src={imgSrc}
          alt={altText}
          className="max-w-full h-auto rounded-lg my-2 shadow-lg"
          loading="lazy"
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      parts.push(...processBoldAndUrlsOnly(remainingText, keyOffset + parts.length));
    }

    return parts.length > 0 ? parts : processBoldAndUrlsOnly(text, keyOffset);
  };

  // Extract video ID and create embed for YouTube or Vimeo
  const getVideoEmbed = (url: string): React.ReactNode | null => {
    // YouTube patterns
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const youtubeMatch = url.match(youtubeRegex);

    if (youtubeMatch && youtubeMatch[1]) {
      const videoId = youtubeMatch[1];
      return (
        <div className="relative w-full my-4" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg border-0"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    // Vimeo patterns
    const vimeoRegex = /(?:vimeo\.com\/)(\d+)/i;
    const vimeoMatch = url.match(vimeoRegex);

    if (vimeoMatch && vimeoMatch[1]) {
      const videoId = vimeoMatch[1];
      return (
        <div className="relative w-full my-4" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg border-0"
            src={`https://player.vimeo.com/video/${videoId}`}
            title="Vimeo video"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    return null;
  };

  // Process only bold and URLs (no HTML tags)
  const processBoldAndUrlsOnly = (text: string, keyOffset: number): React.ReactNode[] => {
    // Split by bold markers
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    const result: React.ReactNode[] = [];

    boldParts.forEach((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        result.push(
          <strong key={`${keyOffset}-bold-${i}`} className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {boldText}
          </strong>
        );
      } else {
        // Auto-detect plain URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urlParts = part.split(urlRegex);

        urlParts.forEach((urlPart, j) => {
          if (urlPart.match(urlRegex)) {
            // Check if URL is a video (YouTube or Vimeo)
            const videoEmbed = getVideoEmbed(urlPart);

            if (videoEmbed) {
              result.push(
                <React.Fragment key={`${keyOffset}-video-${i}-${j}`}>
                  {videoEmbed}
                </React.Fragment>
              );
            } else {
              // Regular link
              result.push(
                <a
                  key={`${keyOffset}-url-${i}-${j}`}
                  href={urlPart}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline transition-colors break-all"
                >
                  {urlPart}
                </a>
              );
            }
          } else if (urlPart) {
            result.push(<React.Fragment key={`${keyOffset}-text-${i}-${j}`}>{urlPart}</React.Fragment>);
          }
        });
      }
    });

    return result;
  };

  const formatText = (content: string) => {
    const lines = content.split('\n');
    const formatted: React.ReactNode[] = [];
    let listItems: { text: string; indent: number }[] = [];
    let numberedListItems: { text: string; number: string }[] = [];

    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-800';
    const headingColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

    const flushList = (index: number) => {
      if (listItems.length > 0) {
        formatted.push(
          <ul key={`list-${index}`} className="list-disc space-y-2 my-3 ml-6">
            {listItems.map((item, i) => (
              <li key={i} className={`${textColor} leading-relaxed`}>
                {processInlineFormatting(item.text)}
              </li>
            ))}
          </ul>
        );
        listItems = [];
      }
      if (numberedListItems.length > 0) {
        formatted.push(
          <ol key={`numlist-${index}`} className="list-decimal space-y-2 my-3 ml-6">
            {numberedListItems.map((item, i) => (
              <li key={i} className={`${textColor} leading-relaxed`}>
                {processInlineFormatting(item.text)}
              </li>
            ))}
          </ol>
        );
        numberedListItems = [];
      }
    };

    lines.forEach((line, index) => {
      // Headers
      if (line.startsWith('### ')) {
        flushList(index);
        formatted.push(
          <h3 key={index} className={`text-lg font-bold mt-4 mb-2 ${headingColor}`}>
            {processInlineFormatting(line.replace('### ', ''))}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        flushList(index);
        formatted.push(
          <h2 key={index} className={`text-xl font-bold mt-5 mb-3 ${headingColor}`}>
            {processInlineFormatting(line.replace('## ', ''))}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        flushList(index);
        formatted.push(
          <h1 key={index} className={`text-2xl font-bold mt-6 mb-4 ${headingColor}`}>
            {processInlineFormatting(line.replace('# ', ''))}
          </h1>
        );
      }
      // Bullet list items (* or -)
      else if (line.trim().match(/^[\*\-]\s+/)) {
        if (numberedListItems.length > 0) {
          flushList(index);
        }
        const text = line.trim().replace(/^[\*\-]\s+/, '');
        const indent = line.search(/\S/);
        listItems.push({ text, indent });
      }
      // Numbered list items (1. 2. etc)
      else if (line.trim().match(/^\d+\.\s+/)) {
        if (listItems.length > 0) {
          flushList(index);
        }
        const match = line.trim().match(/^(\d+)\.\s+(.*)/);
        if (match) {
          numberedListItems.push({ number: match[1], text: match[2] });
        }
      }
      // Empty line
      else if (line.trim() === '') {
        flushList(index);
        formatted.push(<div key={index} className="h-3" />);
      }
      // Code blocks
      else if (line.trim().startsWith('```')) {
        flushList(index);
        // Skip code fence markers
      }
      // Regular paragraph
      else {
        flushList(index);
        formatted.push(
          <p key={index} className={`my-2 ${textColor} leading-relaxed`}>
            {processInlineFormatting(line)}
          </p>
        );
      }
    });

    // Flush any remaining list items
    flushList(lines.length);

    return formatted;
  };

  if (role === 'user') {
    return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>;
  }

  return <div className="max-w-none">{formatText(text)}</div>;
}
