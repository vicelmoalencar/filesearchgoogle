import React from 'react';

interface MessageContentProps {
  text: string;
  role: 'user' | 'model';
  theme?: 'light' | 'dark';
}

export default function MessageContent({ text, role, theme = 'dark' }: MessageContentProps) {
  // Process markdown links [text](url), bold text **text**, and auto-detect URLs
  const processInlineFormatting = (line: string): React.ReactNode[] => {
    // First, process markdown links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(line)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        const beforeText = line.substring(lastIndex, match.index);
        parts.push(...processBoldAndUrls(beforeText, parts.length));
      }

      // Add the link
      const linkText = match[1];
      const linkUrl = match[2];
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

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last link
    if (lastIndex < line.length) {
      const remainingText = line.substring(lastIndex);
      parts.push(...processBoldAndUrls(remainingText, parts.length));
    }

    return parts.length > 0 ? parts : processBoldAndUrls(line, 0);
  };

  // Process bold text and auto-detect plain URLs
  const processBoldAndUrls = (text: string, keyOffset: number): React.ReactNode[] => {
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
