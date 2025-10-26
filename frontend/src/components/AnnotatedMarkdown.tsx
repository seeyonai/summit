import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { AlertTriangle, Circle } from 'lucide-react';

interface AnnotatedMarkdownProps {
  content: string;
  className?: string;
}

// Utility function to process text and replace annotations with highlighted spans
const processAnnotations = (text: string, keyPrefix: string = ''): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];

  // Check for discussion points
  const discussionRegex = /\*\*\[争论焦点\](.*?)\*\*/g;
  const todoRegex = /\*\*\[待办事项\](.*?)\*\*/g;

  // Find all matches
  const allMatches: Array<{
    type: 'discussion' | 'todo';
    text: string;
    index: number;
    length: number;
  }> = [];

  let match;
  while ((match = discussionRegex.exec(text)) !== null) {
    allMatches.push({
      type: 'discussion',
      text: match[1],
      index: match.index,
      length: match[0].length,
    });
  }

  // Reset regex for todo search
  todoRegex.lastIndex = 0;
  while ((match = todoRegex.exec(text)) !== null) {
    allMatches.push({
      type: 'todo',
      text: match[1],
      index: match.index,
      length: match[0].length,
    });
  }

  // Sort matches by index
  allMatches.sort((a, b) => a.index - b.index);

  // Build parts array
  let lastIndex = 0;
  allMatches.forEach((match, matchIndex) => {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Add the highlighted annotation
    if (match.type === 'discussion') {
      parts.push(
        <span
          key={`${keyPrefix}-discussion-${matchIndex}`}
          className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-md text-yellow-800 dark:text-yellow-200 text-sm font-medium shadow-sm mx-1 font-sans"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{match.text}</span>
        </span>
      );
    } else {
      parts.push(
        <span
          key={`${keyPrefix}-todo-${matchIndex}`}
          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-md text-blue-800 dark:text-blue-200 text-sm font-medium shadow-sm mx-1 font-sans"
        >
          <Circle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{match.text}</span>
        </span>
      );
    }

    lastIndex = match.index + match.length;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

const AnnotatedMarkdown: React.FC<AnnotatedMarkdownProps> = ({ content, className = '' }) => {
  // Custom components for markdown rendering with annotation support
  const components: Components = {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">{children}</h1>
    ),
    h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">{children}</h2>,
    h3: ({ children }) => <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">{children}</h3>,
    p: ({ children }) => {
      // Process children to handle inline annotations
      const processedChildren = React.Children.map(children, (child, index) => {
        if (typeof child === 'string') {
          const processed = processAnnotations(child, `p-${index}`);
          return processed.length === 1 && processed[0] === child ? child : processed;
        }
        return child;
      });

      return <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">{processedChildren}</p>;
    },
    ul: ({ children }) => <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1">{children}</ol>,
    li: ({ children }) => {
      // Process children to handle inline annotations
      const processedChildren = React.Children.map(children, (child, index) => {
        if (typeof child === 'string') {
          const processed = processAnnotations(child, `li-${index}`);
          return processed.length === 1 && processed[0] === child ? child : processed;
        }
        return child;
      });

      return <li className="text-gray-700 dark:text-gray-300 leading-relaxed">{processedChildren}</li>;
    },
    strong: ({ children }) => {
      const text = React.Children.toArray(children).join('');

      // Check for discussion points in strong text
      if (text.includes('[争论焦点]')) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-md text-yellow-800 dark:text-yellow-200 text-sm font-medium shadow-sm font-sans">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{text.replace('[争论焦点]', '')}</span>
          </span>
        );
      }

      // Check for todo items in strong text
      if (text.includes('[待办事项]')) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-md text-blue-800 dark:text-blue-200 text-sm font-medium shadow-sm font-sans">
            <Circle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{text.replace('[待办事项]', '')}</span>
          </span>
        );
      }

      return <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>;
    },
    code: ({ children }) => (
      <code className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-1 py-0.5 rounded text-sm">{children}</code>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 italic text-gray-600 dark:text-gray-400 my-4">
        {children}
      </blockquote>
    ),
  };

  return (
    <div
      className={`prose prose-sm max-w-none ${className} prose-headings:font-sans prose-p:leading-relaxed prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-h1:text-gray-900 dark:prose-h1:text-gray-100 prose-h2:text-gray-800 dark:prose-h2:text-gray-200 prose-h3:text-gray-800 dark:prose-h3:text-gray-300`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeHighlight, rehypeRaw]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default AnnotatedMarkdown;
