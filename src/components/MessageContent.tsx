import React from 'react';

interface MessageContentProps {
  text: string;
  role: 'user' | 'model';
  theme?: 'light' | 'dark';
}

export default function MessageContent({ text, role, theme = 'dark' }: MessageContentProps) {
  // Process bold text **text** and return React nodes
  const processBold = (line: string): React.ReactNode[] => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={i} className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{boldText}</strong>;
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
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
                {processBold(item.text)}
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
                {processBold(item.text)}
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
            {processBold(line.replace('### ', ''))}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        flushList(index);
        formatted.push(
          <h2 key={index} className={`text-xl font-bold mt-5 mb-3 ${headingColor}`}>
            {processBold(line.replace('## ', ''))}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        flushList(index);
        formatted.push(
          <h1 key={index} className={`text-2xl font-bold mt-6 mb-4 ${headingColor}`}>
            {processBold(line.replace('# ', ''))}
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
            {processBold(line)}
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
