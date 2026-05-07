import type { ReactNode } from 'react';
import { Send } from 'lucide-react';

import type { Language, ThemeTokens } from '../../utils/settings';

interface QuickAction {
  zh: string;
  en: string;
  profile: string;
}

interface TutorComposerProps {
  input: string;
  isSending: boolean;
  language: Language;
  quickActions: QuickAction[];
  conversationNotice: ReactNode;
  tokens: ThemeTokens;
  t: <T extends string>(zh: T, en: T) => T;
  onInputChange: (value: string) => void;
  onSend: (content: string, profile?: string) => void;
}

export function TutorComposer({
  input,
  isSending,
  language,
  quickActions,
  conversationNotice,
  tokens,
  t,
  onInputChange,
  onSend,
}: TutorComposerProps) {
  const canSend = Boolean(input.trim()) && !isSending;

  return (
    <section
      className="rounded-[26px] p-3"
      style={{
        maxWidth: 780,
        margin: '0 auto',
        borderRadius: 26,
        background: tokens.surfaceElevated,
        border: tokens.borderSubtle,
        boxShadow: tokens.shadowSoft,
      }}
    >
      {conversationNotice}
      <textarea
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSend(input);
          }
        }}
        placeholder={t('有问题，尽管问', 'Ask anything')}
        className="max-h-40 min-h-[70px] w-full resize-none bg-transparent px-3 py-3 text-base outline-none placeholder:text-[var(--ai-placeholder-text)]"
        style={{
          border: 0,
          boxShadow: 'none',
          borderRadius: 18,
          background: 'transparent',
          color: tokens.textPrimary,
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.zh}
              onClick={() => onSend(action[language], action.profile)}
              className="rounded-full border px-3 py-2 text-sm hover:bg-[var(--ai-hover-surface)]"
              style={{ borderColor: tokens.borderSubtle, color: tokens.textSecondary }}
              disabled={isSending}
            >
              {action[language]}
            </button>
          ))}
        </div>

        <button
          onClick={() => onSend(input)}
          disabled={!canSend}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            background: canSend ? tokens.textPrimary : tokens.disabledSurface,
            color: canSend ? tokens.textInverted : tokens.disabledText,
          }}
          aria-label={t('发送', 'Send')}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
