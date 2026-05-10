import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema, type Options as RehypeSanitizeOptions } from 'rehype-sanitize';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import { normalizeMathDelimiters } from '../utils/mathContent';

interface MathMessageProps {
  content: string;
  isUser?: boolean;
}

const katexSanitizeSchema: RehypeSanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ['className', /^language-./, 'math-inline', 'math-display'],
    ],
    div: [...(defaultSchema.attributes?.div ?? []), ['className', 'math', 'math-display']],
    span: [...(defaultSchema.attributes?.span ?? []), ['className', 'math', 'math-inline']],
  },
};

export function MathMessage({ content, isUser = false }: MathMessageProps) {
  const normalizedContent = useMemo(() => normalizeMathDelimiters(content), [content]);

  return (
    <div className={isUser ? 'math-message math-message-user' : 'math-message math-message-tutor'}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeSanitize, katexSanitizeSchema], rehypeKatex]}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
