import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Content, STATUS_LABELS, TYPE_LABELS } from '../types';

interface Props {
  onSelectContent: (content: Content) => void;
  onCreateContent: (date: string) => void;
  refreshKey: number;
}

export function Calendar({ onSelectContent, onCreateContent, refreshKey }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [contents, setContents] = useState<Content[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    loadContents();
  }, [year, month, refreshKey]);

  async function loadContents() {
    try {
      const data = await invoke<Content[]>('get_contents_by_month', { year, month });
      setContents(data);
    } catch (e) {
      console.error('Failed to load contents:', e);
    }
  }

  function getDaysInMonth(y: number, m: number) {
    return new Date(y, m, 0).getDate();
  }

  function getFirstDayOfMonth(y: number, m: number) {
    return new Date(y, m - 1, 1).getDay();
  }

  function formatDate(day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function getContentsForDay(day: number): Content[] {
    const dateStr = formatDate(day);
    return contents.filter(c => c.scheduled_date === dateStr);
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 2, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month, 1));
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  const today = new Date();
  const isToday = (day: number) =>
    year === today.getFullYear() &&
    month === today.getMonth() + 1 &&
    day === today.getDate();

  const statusStyles: Record<Content['status'], string> = {
    planned: 'bg-amber-100 text-amber-700',
    ai_generated: 'bg-blue-100 text-blue-700',
    ready_to_post: 'bg-emerald-100 text-emerald-700',
    posted: 'bg-gray-200 text-gray-700',
    skipped: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded">
          ◀
        </button>
        <h2 className="text-lg font-semibold">
          {year}年 {month}月
        </h2>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">
          ▶
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {weekDays.map((day, i) => (
          <div
            key={day}
            className={`p-2 text-center text-sm font-medium bg-gray-50 ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}

        {emptyDays.map(i => (
          <div key={`empty-${i}`} className="bg-white min-h-[100px]" />
        ))}

        {days.map(day => {
          const dayContents = getContentsForDay(day);
          return (
            <div
              key={day}
              className={`bg-white min-h-[100px] p-1 cursor-pointer hover:bg-gray-50 ${
                isToday(day) ? 'ring-2 ring-primary-500 ring-inset' : ''
              }`}
              onClick={() => onCreateContent(formatDate(day))}
            >
                <div
                  className={`text-sm mb-1 ${
                    isToday(day) ? 'font-bold text-primary-600' : 'text-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{day}</span>
                    {dayContents.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {dayContents.length}件
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  {dayContents.slice(0, 2).map(content => (
                    <div
                      key={content.id}
                      onClick={e => {
                        e.stopPropagation();
                        onSelectContent(content);
                      }}
                      className="text-xs p-1 rounded bg-primary-50 hover:bg-primary-100 border border-primary-100 group"
                      title={content.topic}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {content.thumbnail_path ? (
                          <img
                            src={convertFileSrc(content.thumbnail_path)}
                            alt=""
                            className="w-6 h-6 object-cover rounded flex-shrink-0"
                        />
                        ) : (
                          <span>{TYPE_LABELS[content.content_type].split(' ')[0]}</span>
                        )}
                        <span className="truncate">{content.topic}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-gray-500 truncate">
                          {TYPE_LABELS[content.content_type]}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusStyles[content.status]}`}>
                          {STATUS_LABELS[content.status].replace(/^\S+\s/, '')}
                        </span>
                      </div>
                    </div>
                  ))}
                  {dayContents.length > 2 && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onSelectContent(dayContents[0]);
                      }}
                      className="w-full text-left text-[11px] text-primary-700 px-1 py-0.5 hover:underline"
                    >
                      +{dayContents.length - 2}件を表示
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
