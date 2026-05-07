import { useState } from 'react';
import { Calendar, Clock, BookOpen } from 'lucide-react';
import type { DashboardCalendarEvent } from '../utils/dashboardApi';
import { useSettings } from '../utils/settings';

interface StudyCalendarProps {
  events?: DashboardCalendarEvent[];
}

const typeStyles = {
  task: { tone: 'success', icon: '✓', label: { zh: '任务', en: 'Task' } },
  chat: { tone: 'info', icon: 'AI', label: { zh: 'Tutor', en: 'Tutor' } },
  session: { tone: 'danger', icon: '◎', label: { zh: '训练', en: 'Session' } },
};

export function StudyCalendar({ events = [] }: StudyCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const { language, tokens, t } = useSettings();

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const selectedDateStr = selectedDate ? formatDate(selectedDate) : '';
  const selectedEvents = events.filter((event) => event.date === selectedDateStr);

  const renderCalendar = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    const monthNames = language === 'zh'
      ? ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    const accent = tokens.accentPrimary;
    const todayBg = tokens.accentPrimarySoft;
    const todayText = tokens.accentPrimary;
    const hoverBg = tokens.hoverSurface;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = formatDate(date);
      const isSelected = selectedDate && formatDate(selectedDate) === dateStr;
      const isToday = formatDate(today) === dateStr;
      const hasCourses = events.some((event) => event.date === dateStr);

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`h-8 w-8 rounded-lg text-sm font-medium transition-all border ${hasCourses ? 'relative' : ''}`}
          style={{
            background: isSelected ? accent : isToday ? todayBg : 'transparent',
            color: isSelected ? tokens.textInverted : isToday ? todayText : tokens.textPrimary,
            border: isSelected ? `1px solid ${accent}` : tokens.borderSoft,
          }}
          onMouseEnter={(e) => {
            if (!isSelected && !isToday) e.currentTarget.style.background = hoverBg;
          }}
          onMouseLeave={(e) => {
            if (!isSelected && !isToday) e.currentTarget.style.background = 'transparent';
          }}
        >
          {day}
          {hasCourses && (
            <div
              className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 transform rounded-full"
              style={{ background: tokens.accentSecondary }}
            />
          )}
        </button>
      );
    }

    return (
      <div className="p-4">
        <div className="text-center mb-4">
          <h3 className="font-medium" style={{ color: tokens.textPrimary }}>
            {currentYear} {monthNames[currentMonth]}
          </h3>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {(language === 'zh'
            ? ['日', '一', '二', '三', '四', '五', '六']
            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          ).map((day) => (
            <div
              key={day}
              className="h-8 flex items-center justify-center text-xs font-medium"
              style={{ color: tokens.textSecondary }}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm transition-all duration-300" style={{ background: tokens.surface, border: tokens.borderStrong, boxShadow: tokens.shadow }}>
      <div className="p-6 border-b" style={{ background: tokens.surfaceMuted, borderBottom: tokens.borderSoft }}>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl" style={{ background: tokens.surfaceAccent, border: tokens.borderSoft }}>
            <Calendar className="h-5 w-5" style={{ color: tokens.accentPrimary }} />
          </div>
          <h2 className="text-lg font-medium" style={{ color: tokens.accentPrimary }}>
            {t('日历', 'Calendar')}
          </h2>
        </div>
      </div>

      <div className="p-6">
        <div className="rounded-2xl mb-4" style={{ background: tokens.surfaceMuted, border: tokens.borderSoft }}>
          {renderCalendar()}
        </div>

        {selectedDate && (
          <div className="space-y-4">
            <div
              className="flex items-center gap-2 p-3 rounded-xl"
              style={{
                background: tokens.surfaceAccent,
                border: tokens.borderSoft,
              }}
            >
              <BookOpen className="h-4 w-4" style={{ color: tokens.accentPrimary }} />
              <h4 className="font-medium" style={{ color: tokens.textPrimary }}>
                {selectedDate.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}{' '}
                {t('的课程安排', 'schedule')}
              </h4>
            </div>

            {selectedEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedEvents.map((event, index) => {
                  const eventStyle = typeStyles[event.type as keyof typeof typeStyles] || typeStyles.task;
                  const eventColor =
                    eventStyle.tone === 'success'
                      ? tokens.success
                      : eventStyle.tone === 'danger'
                        ? tokens.danger
                        : tokens.info;
                  return (
                  <div
                    key={event.id}
                    className="group p-4 rounded-2xl border transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      background: tokens.surfaceMuted,
                      border: tokens.borderSoft,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="text-sm mt-1 font-semibold" style={{ color: eventColor }}>{eventStyle.icon}</div>
                        <div className="space-y-1">
                          <div className="font-medium" style={{ color: tokens.textPrimary }}>
                            {event.title}
                          </div>
                          <div className="flex items-center gap-1 text-sm" style={{ color: tokens.textSecondary }}>
                            <Clock className="h-3 w-3" />
                            <span>{event.time || event.subtitle}</span>
                          </div>
                        </div>
                      </div>
                      <span
                        className="px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm"
                        style={{
                          background: tokens.surfaceAccent,
                          border: tokens.borderSoft,
                          color: eventColor,
                        }}
                      >
                        {eventStyle.label[language]}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border"
                  style={{ background: tokens.surfaceAccent, border: tokens.borderSoft }}
                >
                  <span className="text-2xl">😴</span>
                </div>
                <p style={{ color: tokens.textSecondary }}>
                  {t('今日没有安排课程，好好休息吧～', 'No classes today. Enjoy the break!')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
