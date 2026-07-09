import type { CSSProperties } from 'react';
import type { ThemeTokens } from './settings';

export function cardSurfaceStyle(tokens: ThemeTokens): CSSProperties {
  return {
    background: tokens.surface,
    border: tokens.borderSoft,
    borderRadius: 16,
    boxShadow: tokens.shadow,
  };
}

export function panelSurfaceStyle(tokens: ThemeTokens): CSSProperties {
  return {
    background: tokens.surfaceMuted,
    border: tokens.borderSoft,
    borderRadius: 12,
  };
}

export function chipStyle(tokens: ThemeTokens): CSSProperties {
  return {
    background: tokens.surfaceAccent,
    border: tokens.borderSoft,
    borderRadius: 8,
    color: tokens.textPrimary,
  };
}

export function inputSurfaceStyle(tokens: ThemeTokens): CSSProperties {
  return {
    background: tokens.inputSurface,
    border: tokens.borderSubtle,
    borderRadius: 10,
    color: tokens.textPrimary,
    caretColor: tokens.accentPrimary,
  };
}

export function hoverButtonStyle(tokens: ThemeTokens): CSSProperties {
  return {
    background: 'transparent',
    color: tokens.textSecondary,
  };
}

export function statusPanelStyle(
  tokens: ThemeTokens,
  tone: 'warning' | 'danger' | 'success' | 'info',
): CSSProperties {
  const colors = {
    warning: { background: tokens.warningSoft, color: tokens.warning },
    danger: { background: tokens.dangerSoft, color: tokens.danger },
    success: { background: tokens.successSoft, color: tokens.success },
    info: { background: tokens.infoSoft, color: tokens.info },
  }[tone];

  return {
    ...colors,
    border: tokens.borderSoft,
  };
}

export function primaryActionStyle(tokens: ThemeTokens): CSSProperties {
  return {
    background: tokens.primaryActionGradient,
    border: tokens.borderStrong,
    borderRadius: 12,
    color: tokens.textInverted,
  };
}

export function chatBubbleStyle(tokens: ThemeTokens, isUser: boolean): CSSProperties {
  return {
    background: isUser ? tokens.chatUserBubble : tokens.chatAssistantBubble,
    border: isUser ? tokens.chatUserBorder : tokens.chatAssistantBorder,
    borderRadius: 18,
    color: isUser ? tokens.chatUserText : tokens.chatAssistantText,
    boxShadow: isUser ? tokens.shadowSoft : 'none',
  };
}
