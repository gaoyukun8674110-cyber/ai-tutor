import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

assert.equal(Boolean(packageJson.dependencies['@tanstack/react-query']), true);
assert.equal(Boolean(packageJson.dependencies['rehype-sanitize']), true);
assert.equal(Boolean(packageJson.dependencies['@radix-ui/react-select']), true);
assert.equal(Boolean(packageJson.dependencies['@radix-ui/react-slot']), true);
assert.equal(Boolean(packageJson.dependencies['@radix-ui/react-accordion']), false);
assert.equal(Boolean(packageJson.dependencies['cmdk']), false);

const apiClientSource = readFileSync('src/utils/apiClient.ts', 'utf8');
assert.match(apiClientSource, /X-API-Key/);
assert.match(apiClientSource, /signal\?: AbortSignal/);

const mainSource = readFileSync('src/main.tsx', 'utf8');
assert.match(mainSource, /QueryClientProvider/);

const dashboardPageSource = readFileSync('src/pages/DashboardPage.tsx', 'utf8');
assert.match(dashboardPageSource, /useQuery/);
assert.match(dashboardPageSource, /invalidateQueries/);
assert.match(dashboardPageSource, /Button/);

const settingsSource = readFileSync('src/utils/settings.tsx', 'utf8');
assert.match(settingsSource, /ai-tutor-language/);
assert.match(settingsSource, /ai-tutor-theme/);
assert.match(settingsSource, /t: <T extends string>/);

const tutorSource = readFileSync('src/components/TutorChatWorkspace.tsx', 'utf8');
assert.match(tutorSource, /errorBanner/);
assert.doesNotMatch(tutorSource, /label: t\([^)]*Configuration/);

const tutorChatHookSource = readFileSync('src/features/tutor/useTutorChat.ts', 'utf8');
assert.match(tutorChatHookSource, /AbortController/);

const sidebarSource = readFileSync('src/components/tutor/TutorSidebar.tsx', 'utf8');
assert.match(sidebarSource, /SelectTrigger/);
assert.match(sidebarSource, /SelectItem/);

const mathSource = readFileSync('src/components/MathMessage.tsx', 'utf8');
assert.match(mathSource, /rehype-sanitize/);

const calendarSource = readFileSync('src/components/StudyCalendar.tsx', 'utf8');
assert.doesNotMatch(calendarSource, /borderColor:.*tokens\.borderSoft/);

const uiFiles = readdirSync('src/components/ui').filter((name) => name.endsWith('.tsx') || name.endsWith('.ts')).sort();
assert.deepEqual(uiFiles, ['button.tsx', 'select.tsx', 'utils.ts']);

const backendMaterials = readFileSync('../backend/app/api/materials.py', 'utf8');
assert.match(backendMaterials, /BackgroundTasks/);
assert.match(backendMaterials, /read_validated_upload/);

const backendMain = readFileSync('../backend/app/main.py', 'utf8');
assert.match(backendMain, /X-Frame-Options/);
assert.match(backendMain, /Content-Security-Policy/);

const backendService = readFileSync('../backend/app/services/materials.py', 'utf8');
assert.match(backendService, /embedding_mode/);
assert.match(backendService, /PersistentVectorIndex/);
assert.match(backendService, /search_snapshot/);

const backendConfig = readFileSync('../backend/app/config.py', 'utf8');
assert.match(backendConfig, /RAG_SEARCH_CANDIDATE_LIMIT/);
