import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, PanelLeftOpen } from 'lucide-react';
import { useSettings } from '../utils/settings';
import { statusPanelStyle } from '../utils/glassStyles';
import {
  deleteTutorConversation,
  exportTutorConversation,
  fetchTutorConversation,
  fetchTutorConversations,
  fetchPromptProfiles,
  fetchStudyMaterials,
  sendTutorChat,
  searchTutorConversations,
  uploadStudyMaterial,
  type LearningPhase,
  type MaterialContext,
  type PromptProfile,
  type StudyMaterial,
  type TutorConversationSummary,
} from '../utils/chatApi';
import { resolveFocusStatus, type FocusTone } from '../utils/focusStatus';
import { getUserFacingError, isAbortError } from '../utils/apiClient';
import { TutorComposer } from './tutor/TutorComposer';
import { TutorMessageList } from './tutor/TutorMessageList';
import { TutorSidebar } from './tutor/TutorSidebar';
import { useTutorTimer } from './tutor/useTutorTimer';
import { useDebouncedValue } from '../utils/useDebouncedValue';
import type { ChatMessage, ChatRole } from './tutor/types';

interface TutorChatWorkspaceProps {
  trainingMode: string;
  onExit: () => void;
  onPomodoroLogged?: () => void;
}

const quickActions = [
  { zh: '给我一个提示', en: 'Give me a hint', profile: 'three_stage' },
  { zh: '换一种讲法', en: 'Explain differently', profile: 'three_stage' },
  { zh: '检查我的答案', en: 'Check my answer', profile: 'three_stage' },
  { zh: '安排下一步', en: 'Plan next step', profile: 'three_stage' },
];

function normalizeLearningPhase(phase?: string | null): LearningPhase {
  if (phase === 'planning' || phase === 'understanding' || phase === 'feynman' || phase === 'general') {
    return phase;
  }
  return 'general';
}

const focusToneClass: Record<FocusTone, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  paused: 'border-amber-200 bg-amber-50 text-amber-800',
  ready: 'border-[var(--ai-border-subtle)] bg-[var(--ai-surface-muted)] text-[var(--ai-text-secondary)]',
  rest: 'border-sky-200 bg-sky-50 text-sky-800',
  thinking: 'border-indigo-200 bg-indigo-50 text-indigo-800',
};

const focusDotClass: Record<FocusTone, string> = {
  active: 'bg-emerald-500',
  paused: 'bg-amber-500',
  ready: 'bg-[var(--ai-text-secondary)]',
  rest: 'bg-sky-500',
  thinking: 'bg-indigo-500',
};

function createMessageId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toChatMessages(messages: { id?: string | number; role: string; content: string; label?: string | null }[]): ChatMessage[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      id: String(message.id ?? createMessageId()),
      role: message.role as ChatRole,
      content: message.content,
      label: message.label || undefined,
    }));
}

export function TutorChatWorkspace({ trainingMode, onExit, onPomodoroLogged }: TutorChatWorkspaceProps) {
  const { language, textStyle, tokens, t } = useSettings();

  const [profiles, setProfiles] = useState<PromptProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('three_stage');
  const [learningPhase, setLearningPhase] = useState<LearningPhase>('general');
  const [customPrompt, setCustomPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyItems, setHistoryItems] = useState<TutorConversationSummary[]>([]);
  const [historySearchOpen, setHistorySearchOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const debouncedHistorySearchQuery = useDebouncedValue(historySearchQuery.trim(), 250);
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);
  const [activeMaterialContext, setActiveMaterialContext] = useState<MaterialContext | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [currentExchangeCount, setCurrentExchangeCount] = useState(0);
  const [currentSummary, setCurrentSummary] = useState<string | null>(null);
  const [carryOverSummary, setCarryOverSummary] = useState<string | null>(null);
  const [carryOverMessages, setCarryOverMessages] = useState<ChatMessage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);
  const historySearchInputRef = useRef<HTMLInputElement>(null);
  const { remainingSeconds, timerState, isRunning, timerHasStarted, resetTimer, startNextRound, toggleTimer } =
    useTutorTimer({
      language,
      onPomodoroLogged,
      onTimerMessage: (content) => {
        setMessages((items) => [
          ...items,
          {
            id: createMessageId(),
            role: 'assistant',
            label: 'Timer',
            content,
          },
        ]);
      },
    });

  const currentProfile = profiles.find((profile) => profile.id === selectedProfile);
  const visibleExchangeCount = Math.max(
    currentExchangeCount,
    messages.filter((message) => message.role === 'user').length,
  );

  const modeLabel = useMemo(() => {
    if (trainingMode === 'light') return language === 'zh' ? '轻度学习' : 'Light study';
    if (trainingMode === 'break') return language === 'zh' ? '休息恢复' : 'Rest reset';
    return language === 'zh' ? '深度专注' : 'Deep focus';
  }, [trainingMode, language]);
  const focusStatus = useMemo(
    () =>
      resolveFocusStatus({
        timerState,
        isRunning,
        remainingSeconds,
        timerHasStarted,
        messageCount: messages.filter((message) => message.label !== 'Timer').length,
        userExchangeCount: visibleExchangeCount,
        selectedMaterialCount: selectedMaterialIds.length,
        activeMaterialHitCount: activeMaterialContext?.chunks?.length ?? 0,
        learningPhase,
        isSending,
      }),
    [
      activeMaterialContext,
      isRunning,
      isSending,
      learningPhase,
      messages,
      remainingSeconds,
      selectedMaterialIds.length,
      timerHasStarted,
      timerState,
      visibleExchangeCount,
    ],
  );
  const focusText = focusStatus.focus[language];
  const phaseText = focusStatus.phase[language];
  const detailText = focusStatus.detail[language];

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    async function loadMetadata() {
      try {
        const [profileList, conversationList, materialList] = await Promise.all([
          fetchPromptProfiles({ signal: controller.signal }),
          fetchTutorConversations({ signal: controller.signal }),
          fetchStudyMaterials({ signal: controller.signal }),
        ]);
        if (!alive) return;
        setProfiles(profileList);
        setHistoryItems(conversationList);
        setMaterials(materialList);
        setSelectedMaterialIds(materialList.map((material) => material.id));
      } catch (error) {
        if (isAbortError(error)) return;
        if (!alive) return;
        setLoadError(getUserFacingError(error));
      }
    }

    loadMetadata();
    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, activeMaterialContext]);

  useEffect(() => {
    if (!historySearchOpen) return;
    historySearchInputRef.current?.focus();
  }, [historySearchOpen]);

  useEffect(() => {
    if (!historySearchOpen) return;

    let alive = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearchingHistory(true);
      try {
        const query = debouncedHistorySearchQuery;
        const conversations = query
          ? await searchTutorConversations(query, { signal: controller.signal })
          : await fetchTutorConversations({ signal: controller.signal });
        if (!alive) return;
        setHistoryItems(conversations);
      } catch (error) {
        if (isAbortError(error)) return;
        if (!alive) return;
        setLoadError(getUserFacingError(error));
      } finally {
        if (alive) setIsSearchingHistory(false);
      }
    }, 0);

    return () => {
      alive = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [debouncedHistorySearchQuery, historySearchOpen]);

  const startNewChat = () => {
    const shouldCarryContext = currentExchangeCount >= 15 && Boolean(currentSummary);
    setCarryOverSummary(shouldCarryContext ? currentSummary : null);
    setCarryOverMessages(
      shouldCarryContext
        ? messages
            .filter((message) => message.role === 'user' || (message.role === 'assistant' && message.label !== 'Timer'))
            .slice(-12)
        : [],
    );
    setMessages([]);
    setActiveConversationId(null);
    setCurrentExchangeCount(0);
    setCurrentSummary(null);
    setActiveMaterialContext(null);
    setLearningPhase('general');
    setInput('');
  };

  const openHistoryItem = async (id: number) => {
    try {
      const conversation = await fetchTutorConversation(id);
      setActiveConversationId(conversation.id);
      setCurrentExchangeCount(conversation.exchange_count ?? Math.floor(conversation.message_count / 2));
      setCurrentSummary(conversation.summary || null);
      setLearningPhase('general');
      setCarryOverSummary(null);
      setCarryOverMessages([]);
      setActiveMaterialContext(null);
      setMessages(toChatMessages(conversation.messages));
      setInput('');
    } catch (error) {
      setLoadError(getUserFacingError(error));
    }
  };

  const removeHistoryItem = async (id: number) => {
    try {
      await deleteTutorConversation(id);
      setHistoryItems((items) => items.filter((item) => item.id !== id));
      if (activeConversationId === id) startNewChat();
    } catch (error) {
      setLoadError(getUserFacingError(error));
    }
  };

  const exportHistoryItem = async (id: number) => {
    try {
      const exported = await exportTutorConversation(id);
      const blob = new Blob([exported.content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exported.filename || `tutor-conversation-${id}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setLoadError(getUserFacingError(error));
    }
  };

  const closeHistorySearch = async () => {
    setHistorySearchOpen(false);
    setHistorySearchQuery('');
    setIsSearchingHistory(false);
    try {
      setHistoryItems(await fetchTutorConversations());
    } catch (error) {
      setLoadError(getUserFacingError(error));
    }
  };

  const toggleMaterialSelection = (materialId: number) => {
    setSelectedMaterialIds((ids) =>
      ids.includes(materialId)
        ? ids.filter((id) => id !== materialId)
        : [...ids, materialId],
    );
  };

  const handleMaterialUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isUploadingMaterial) return;

    setIsUploadingMaterial(true);
    setMaterialError(null);
    try {
      const material = await uploadStudyMaterial(file);
      setMaterials((items) => [material, ...items.filter((item) => item.id !== material.id)]);
      setSelectedMaterialIds((ids) => Array.from(new Set([...ids, material.id])));
    } catch (error) {
      setMaterialError(getUserFacingError(error));
    } finally {
      setIsUploadingMaterial(false);
      event.target.value = '';
    }
  };

  const sendMessage = async (content: string, nextProfile = selectedProfile) => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmed,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setSelectedProfile(nextProfile);
    setIsSending(true);
    setErrorBanner(null);
    setActiveMaterialContext(null);

    try {
      const response = await sendTutorChat({
        conversation_id: activeConversationId,
        provider: 'auto',
        prompt_profile: nextProfile,
        system_prompt_override: nextProfile === 'custom' ? customPrompt : null,
        messages: nextMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        tutor_context: {
          mode: trainingMode,
          mode_label: modeLabel,
          timer_state: timerState,
          remaining_seconds: remainingSeconds,
          learning_phase: learningPhase,
          goal: 'AI Tutor learning session',
          previous_session_summary: carryOverSummary,
          recent_context_messages: carryOverMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          material_ids: selectedMaterialIds,
        },
      });
      const profileLabel = profiles.find((profile) => profile.id === response.prompt_profile)?.name || currentProfile?.name || 'Tutor';

      if (response.messages?.length) {
        setMessages(toChatMessages(response.messages));
      } else {
        setMessages((items) => [
          ...items,
          {
            id: createMessageId(),
            role: 'assistant',
            label: profileLabel,
            content: response.message.content,
          },
        ]);
      }
      if (response.conversation_id) setActiveConversationId(response.conversation_id);
      setLearningPhase(normalizeLearningPhase(response.learning_phase));
      setCurrentExchangeCount(
        response.exchange_count ?? response.conversation?.exchange_count ?? nextMessages.filter((message) => message.role === 'user').length,
      );
      if (response.conversation?.summary) setCurrentSummary(response.conversation.summary);
      setActiveMaterialContext(response.material_context ?? null);
      if (response.conversation) {
        setHistoryItems((items) => [
          response.conversation as TutorConversationSummary,
          ...items.filter((item) => item.id !== response.conversation_id),
        ]);
      }
    } catch (error) {
      setMessages(nextMessages);
      setErrorBanner(
        error instanceof Error
          ? t(`Model unavailable: ${getUserFacingError(error)}`, `Model unavailable: ${getUserFacingError(error)}`)
          : t('Model unavailable. Check backend provider setup.', 'Model unavailable. Check backend provider setup.'),
      );
    } finally {
      setIsSending(false);
    }
  };

  const sidebarWidth = 240;

  const renderConversationNotice = () => {
    if (visibleExchangeCount < 10) return null;

    const shouldStartNew = visibleExchangeCount >= 15;
    return (
      <div
        className="mb-3 flex flex-col gap-2 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
        style={{
          background: shouldStartNew ? tokens.accentSecondarySoft : tokens.warningSoft,
          borderColor: shouldStartNew ? tokens.accentSecondary : tokens.warning,
          color: shouldStartNew ? tokens.accentSecondary : tokens.warning,
        }}
      >
        <div className="flex min-w-0 items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {shouldStartNew
              ? t('已达到 15 轮，系统已生成学习摘要。建议开启新学习会话，后续只携带摘要和最近关键上下文。', '15 exchanges reached. A study summary is ready. Start a new chat to carry only the summary and recent key context.')
              : t('这段对话已经超过 10 轮，继续聊可以，但建议准备开启新学习会话以节省 token。', 'This chat has passed 10 exchanges. You can continue, but consider starting a new chat to save tokens.')}
          </span>
        </div>
        {shouldStartNew && (
          <button
            onClick={startNewChat}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-[var(--ai-hover-surface)]"
            style={{ background: tokens.surfaceElevated, color: tokens.accentSecondary }}
          >
            {t('开启新学习会话', 'Start new chat')}
          </button>
        )}
      </div>
    );
  };

  const renderComposer = () => (
    <TutorComposer
      input={input}
      isSending={isSending}
      language={language}
      quickActions={quickActions}
      conversationNotice={renderConversationNotice()}
      t={t}
      onInputChange={setInput}
      onSend={sendMessage}
      tokens={tokens}
    />
  );

  return (
    <div
      className="bg-[var(--ai-surface-elevated)]"
      style={{
        ...textStyle,
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        color: tokens.textPrimary,
      }}
    >
      <div style={{ width: '100%', height: '100%', minHeight: 0 }}>
        <TutorSidebar
          sidebarOpen={sidebarOpen}
          sidebarWidth={sidebarWidth}
          tokens={tokens}
          language={language}
          profiles={profiles}
          selectedProfile={selectedProfile}
          customPrompt={customPrompt}
          materials={materials}
          selectedMaterialIds={selectedMaterialIds}
          isUploadingMaterial={isUploadingMaterial}
          materialError={materialError}
          loadError={loadError}
          remainingSeconds={remainingSeconds}
          timerState={timerState}
          isRunning={isRunning}
          timerHasStarted={timerHasStarted}
          historySearchOpen={historySearchOpen}
          historySearchQuery={historySearchQuery}
          isSearchingHistory={isSearchingHistory}
          historyItems={historyItems}
          activeConversationId={activeConversationId}
          materialInputRef={materialInputRef}
          historySearchInputRef={historySearchInputRef}
          t={t}
          onExit={onExit}
          onCollapse={() => setSidebarOpen(false)}
          onStartNewChat={startNewChat}
          onToggleHistorySearch={() => {
            if (historySearchOpen) {
              void closeHistorySearch();
            } else {
              setHistorySearchOpen(true);
            }
          }}
          onCloseHistorySearch={() => void closeHistorySearch()}
          onHistorySearchQueryChange={setHistorySearchQuery}
          onSelectedProfileChange={setSelectedProfile}
          onCustomPromptChange={setCustomPrompt}
          onMaterialUpload={handleMaterialUpload}
          onToggleMaterialSelection={toggleMaterialSelection}
          onToggleTimer={toggleTimer}
          onResetTimer={resetTimer}
          onStartNextRound={startNextRound}
          onOpenHistoryItem={(id) => void openHistoryItem(id)}
          onExportHistoryItem={(id) => void exportHistoryItem(id)}
          onRemoveHistoryItem={(id) => void removeHistoryItem(id)}
        />

        <main
          className="bg-[var(--ai-surface-elevated)]"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            left: sidebarOpen ? sidebarWidth : 0,
            display: 'flex',
            minHeight: 0,
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'left 180ms ease',
          }}
        >
          <header className="flex h-14 items-center justify-between px-5" style={{ flexShrink: 0 }}>
            <div>
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--ai-hover-surface)]"
                  aria-label={t('展开侧边栏', 'Open sidebar')}
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: tokens.textSecondary }}>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${focusToneClass[focusStatus.focus.tone]}`}
                title={`${modeLabel} · ${detailText}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${focusDotClass[focusStatus.focus.tone]}`} />
                {focusText}
              </span>
              <span className="rounded-full px-2 py-1 text-xs" style={{ background: tokens.surfaceMuted, border: tokens.borderSubtle, color: tokens.textSecondary }}>
                {language === 'zh' ? `当前阶段：${phaseText}` : `Phase: ${phaseText}`}
              </span>
              <span className="hidden max-w-[420px] truncate text-xs lg:inline" style={{ color: tokens.textMuted }} title={detailText}>
                {detailText}
              </span>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="px-5"
            style={{ minHeight: 0, flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}
          >
            {errorBanner && (
              <div className="mx-auto mt-2 flex max-w-3xl items-start gap-2 rounded-2xl border px-4 py-3 text-sm" style={statusPanelStyle(tokens, 'warning')}>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">{errorBanner}</div>
                <button
                  onClick={() => setErrorBanner(null)}
                  className="rounded-md px-2 py-0.5 text-xs font-medium hover:bg-[var(--ai-hover-surface)]"
                >
                  {t('关闭', 'Dismiss')}
                </button>
              </div>
            )}
            {messages.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center text-center"
                style={{ minHeight: '66vh', maxWidth: 900, margin: '0 auto', paddingTop: 18 }}
              >
                <h1
                  className="leading-tight tracking-normal"
                  style={{
                    fontSize: 40,
                    fontFamily:
                      language === 'zh'
                        ? '"STXingkai", "KaiTi", "Kaiti SC", "KaiTi TC", "SimKai", serif'
                        : '"Georgia", "Times New Roman", serif',
                    fontWeight: 400,
                    letterSpacing: 0,
                    color: tokens.textPrimary,
                  }}
                >
                  {t('准备好了，随时开始', 'Ready when you are')}
                </h1>
                <div style={{ width: '100%', marginTop: 48 }}>
                  {renderComposer()}
                </div>
              </div>
            ) : (
              <TutorMessageList
                messages={messages}
                materialContext={activeMaterialContext}
                isSending={isSending}
                language={language}
                t={t}
                tokens={tokens}
              />
            )}
          </div>

          {messages.length > 0 && <div className="px-5 pb-6 pt-2" style={{ flexShrink: 0 }}>{renderComposer()}</div>}
        </main>
      </div>
    </div>
  );
}
