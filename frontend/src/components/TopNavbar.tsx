import { useEffect, useState } from 'react';
import {
  Brain,
  BookOpen,
  Calendar,
  ChevronDown,
  Languages,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  Target,
  Trophy,
  User,
} from 'lucide-react';
import { useSettings } from '../utils/settings';

export function TopNavbar() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { language, toggleLanguage, theme, toggleTheme, tokens, t } = useSettings();

  const showPlaceholder = (label: string) => {
    setNotice(t(`${label} is under construction`, `${label} is under construction`));
  };

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const navLinks = [
    { icon: BookOpen, label: t('Learning', 'Learning') },
    { icon: Calendar, label: t('Schedule', 'Schedule') },
    { icon: Target, label: t('Goals', 'Goals') },
    { icon: Trophy, label: t('Achievements', 'Achievements') },
  ];

  const userMenu = [
    { icon: User, label: t('Profile', 'Profile') },
    { icon: Settings, label: t('Settings', 'Settings') },
  ];

  const navStyle = {
    background: tokens.surfaceMuted,
    backdropFilter: 'blur(15px)',
    borderBottom: tokens.borderSoft,
    boxShadow: tokens.shadow,
  };

  const chipStyle = {
    background: tokens.surfaceAccent,
    border: tokens.borderSoft,
  };

  return (
    <header className="sticky top-0 z-50 w-full px-0 shadow-lg" style={navStyle}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md" style={chipStyle}>
                <Brain className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold" style={{ color: tokens.textPrimary }}>
                AI Tutor
              </h1>
            </div>

            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.label}
                    onClick={() => showPlaceholder(link.label)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors"
                    style={{ color: tokens.textSecondary, background: 'transparent' }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = tokens.surfaceAccent;
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => showPlaceholder(t('Search', 'Search'))}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors"
              style={chipStyle}
            >
              <Search className="h-4 w-4" />
              {t('Search', 'Search')}
            </button>

            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors"
              style={chipStyle}
              aria-label="toggle language"
            >
              <Languages className="h-4 w-4" />
              {language === 'zh' ? 'ZH -> EN' : 'EN -> ZH'}
            </button>

            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors"
              style={chipStyle}
              aria-label="toggle theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {theme === 'light' ? t('Night mode', 'Night mode') : t('Day mode', 'Day mode')}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu((value) => !value)}
                className="relative flex items-center gap-2 rounded-full p-1 transition-colors"
                style={{ background: 'transparent' }}
                aria-label={t('User menu', 'User menu')}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full font-medium shadow-md"
                  style={{
                    background: tokens.surfaceAccent,
                    border: tokens.borderSoft,
                    color: tokens.textPrimary,
                  }}
                >
                  {language === 'zh' ? 'S' : 'A'}
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
                  style={{
                    background: tokens.success,
                    boxShadow: '0 0 8px var(--ai-success)',
                    borderColor: tokens.surface,
                  }}
                />
                <ChevronDown className="h-3 w-3" />
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl py-2 shadow-xl"
                  style={{
                    background: tokens.surface,
                    backdropFilter: 'blur(20px)',
                    border: tokens.borderSoft,
                    boxShadow: tokens.shadow,
                  }}
                >
                  <div className="border-b px-4 py-2" style={{ borderColor: tokens.borderSoft }}>
                    <p className="text-sm font-medium" style={{ color: tokens.textPrimary }}>
                      {t('Student', 'Student')}
                    </p>
                    <p className="text-xs" style={{ color: tokens.textSecondary }}>
                      student@example.com
                    </p>
                  </div>
                  {userMenu.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => showPlaceholder(item.label)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-white/10"
                        style={{ color: tokens.textSecondary }}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                  <div className="h-px" style={{ background: tokens.borderSoft }} />
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      showPlaceholder(t('Log out', 'Log out'));
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('Log out', 'Log out')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {notice && (
        <div className="absolute right-6 top-[72px] rounded-xl px-4 py-2 text-sm shadow-lg" style={chipStyle}>
          {notice}
        </div>
      )}
    </header>
  );
}
