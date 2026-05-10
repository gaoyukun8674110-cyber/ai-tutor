import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const apiClientSource = readFileSync('src/utils/apiClient.ts', 'utf8');
assert.match(apiClientSource, /class ApiError extends Error/);
assert.match(apiClientSource, /traceId\?: string/);
assert.match(apiClientSource, /getUserFacingError/);
assert.match(apiClientSource, /Authentication is required/);
assert.match(apiClientSource, /body\.detail\.user_message/);
assert.match(apiClientSource, /X-Trace-Id/);

const debounceSource = readFileSync('src/utils/useDebouncedValue.ts', 'utf8');
assert.match(debounceSource, /useDebouncedValue/);
assert.match(debounceSource, /setTimeout/);
assert.match(debounceSource, /clearTimeout/);

const tutorSource = readFileSync('src/components/TutorChatWorkspace.tsx', 'utf8');
assert.doesNotMatch(tutorSource, /Promise\.all\(\[\s*fetchPromptProfiles[\s\S]*fetchTutorConversations[\s\S]*fetchStudyMaterials/);

const tutorChatHookSource = readFileSync('src/features/tutor/useTutorChat.ts', 'utf8');
assert.match(tutorChatHookSource, /FALLBACK_PROMPT_PROFILES/);
assert.match(tutorChatHookSource, /getUserFacingError/);

const tutorHistoryHookSource = readFileSync('src/features/tutor/useTutorHistory.ts', 'utf8');
assert.match(tutorHistoryHookSource, /useDebouncedValue/);
assert.match(tutorHistoryHookSource, /debouncedHistorySearchQuery/);

const chatApiSource = readFileSync('src/utils/chatApi.ts', 'utf8');
assert.match(chatApiSource, /FALLBACK_PROMPT_PROFILES/);
assert.match(chatApiSource, /id: 'three_stage'/);

const dashboardPageSource = readFileSync('src/pages/DashboardPage.tsx', 'utf8');
assert.doesNotMatch(dashboardPageSource, /getUserFacingError/);
assert.doesNotMatch(dashboardPageSource, /Failed to fetch/);

const topNavbarSource = readFileSync('src/components/TopNavbar.tsx', 'utf8');
assert.match(topNavbarSource, /toggleLanguage/);
assert.match(topNavbarSource, /toggleTheme/);
assert.doesNotMatch(topNavbarSource, /href="#"/);

const settingsSource = readFileSync('src/utils/settings.tsx', 'utf8');
assert.match(settingsSource, /chatUserBubble/);
assert.match(settingsSource, /chartTooltipBg/);
assert.match(settingsSource, /primaryActionGradient/);
assert.match(settingsSource, /cssVar\('page-gradient'\)/);

const globalCssSource = readFileSync('src/index.css', 'utf8');
assert.match(globalCssSource, /--ai-page-gradient/);
assert.match(globalCssSource, /body\[data-theme='dark'\]/);
assert.match(globalCssSource, /--ai-chat-user-bubble/);
assert.match(globalCssSource, /--ai-primary-action-gradient/);

const glassStylesSource = readFileSync('src/utils/glassStyles.ts', 'utf8');
assert.match(glassStylesSource, /inputSurfaceStyle/);
assert.match(glassStylesSource, /statusPanelStyle/);
assert.match(glassStylesSource, /primaryActionStyle/);
assert.match(glassStylesSource, /chatBubbleStyle/);

const selectSource = readFileSync('src/components/ui/select.tsx', 'utf8');
assert.match(selectSource, /bg-\[var\(--ai-surface-elevated\)\]/);
assert.match(selectSource, /z-\[80\]/);
assert.doesNotMatch(selectSource, /bg-popover/);

assert.equal(existsSync('src/components/StudyGoals.tsx'), false);
assert.equal(existsSync('src/components/StartTraining.tsx'), false);
assert.equal(existsSync('src/components/figma/ImageWithFallback.tsx'), false);

const backendErrors = readFileSync('../backend/app/utils/errors.py', 'utf8');
assert.match(backendErrors, /def public_error/);
assert.match(backendErrors, /async def http_exception_handler/);
assert.match(backendErrors, /async def unhandled_exception_handler/);
assert.match(backendErrors, /def safe_llm_error/);

const backendMain = readFileSync('../backend/app/main.py', 'utf8');
assert.match(backendMain, /add_exception_handler\(StarletteHTTPException/);
assert.match(backendMain, /add_exception_handler\(Exception/);

const backendLlmService = readFileSync('../backend/app/services/llm_service.py', 'utf8');
assert.match(backendLlmService, /self\._clients: Dict\[str, OpenAI\]/);
assert.match(backendLlmService, /def _get_provider_client/);
assert.match(backendLlmService, /safe_llm_error/);

const backendLlmApi = readFileSync('../backend/app/api/llm.py', 'utf8');
assert.match(backendLlmApi, /def _prepare_tutor_context/);
assert.match(backendLlmApi, /def _build_model_messages/);
assert.match(backendLlmApi, /def _finalize_conversation_response/);

const backendMaterials = readFileSync('../backend/app/services/materials.py', 'utf8');
assert.match(backendMaterials, /\.strip\("\._"\) or "material"/);
