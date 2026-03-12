import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { Calendar } from './components/Calendar';
import { ContentEditor } from './components/ContentEditor';
import { Settings } from './components/Settings';
import { WeeklyPlanGenerator } from './components/WeeklyPlanGenerator';
import { Content, DailySummary, STATUS_LABELS, SchedulerNotification } from './types';
import './index.css';

function App() {
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showWeeklyGenerator, setShowWeeklyGenerator] = useState(false);
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasClaudeKey, setHasClaudeKey] = useState(false);
  const notificationSent = useRef(false);

  useEffect(() => {
    loadTodaySummary();
    checkClaudeKey();
    if (!notificationSent.current) {
      notificationSent.current = true;
      checkAndNotify();
    }
  }, [refreshKey]);

  async function checkAndNotify() {
    try {
      let permission = await isPermissionGranted();
      if (!permission) {
        const result = await requestPermission();
        permission = result === 'granted';
      }
      if (!permission) return;

      const notification = await invoke<SchedulerNotification | null>('check_today_notification');
      if (notification) {
        sendNotification({
          title: notification.title,
          body: notification.body,
        });
      }
    } catch (e) {
      console.error('Notification error:', e);
    }
  }

  async function loadTodaySummary() {
    try {
      const summary = await invoke<DailySummary>('get_today_summary');
      setTodaySummary(summary);
    } catch (e) {
      console.error('Failed to load today summary:', e);
    }
  }

  async function checkClaudeKey() {
    try {
      const has = await invoke<boolean>('has_claude_key');
      setHasClaudeKey(has);
    } catch (e) {
      console.error(e);
    }
  }

  function handleRefresh() {
    setRefreshKey(k => k + 1);
    setSelectedContent(null);
    setSelectedDate(null);
  }

  function handleSelectContent(content: Content) {
    setSelectedContent(content);
    setSelectedDate(null);
  }

  function handleCreateContent(date: string) {
    setSelectedDate(date);
    setSelectedContent(null);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            🧘 ピラティス投稿管理
          </h1>
          <div className="flex items-center gap-2">
            {hasClaudeKey && (
              <button
                onClick={() => setShowWeeklyGenerator(true)}
                className="px-3 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 text-sm"
              >
                🤖 週間プラン生成
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-2 text-gray-600 hover:text-gray-900"
            >
              ⚙️ 設定
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!hasClaudeKey && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              ⚠️ Claude API Keyが設定されていません。
              <button
                onClick={() => setShowSettings(true)}
                className="ml-2 text-yellow-900 underline hover:no-underline"
              >
                設定する
              </button>
            </p>
          </div>
        )}

        {todaySummary && todaySummary.total > 0 && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <h2 className="font-semibold text-gray-900 mb-3">
              📅 今日の投稿 ({todaySummary.date})
            </h2>
            <div className="space-y-2">
              {todaySummary.contents.map(content => (
                <div
                  key={content.id}
                  onClick={() => handleSelectContent(content)}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100"
                >
                  <div>
                    <span className="font-medium">{content.topic}</span>
                  </div>
                  <span className="text-sm">{STATUS_LABELS[content.status]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Calendar
          onSelectContent={handleSelectContent}
          onCreateContent={handleCreateContent}
          refreshKey={refreshKey}
        />
      </main>

      {(selectedContent || selectedDate) && (
        <ContentEditor
          content={selectedContent}
          selectedDate={selectedDate}
          onSave={handleRefresh}
          onClose={() => {
            setSelectedContent(null);
            setSelectedDate(null);
          }}
        />
      )}

      {showSettings && (
        <Settings onClose={() => {
          setShowSettings(false);
          handleRefresh();
        }} />
      )}

      {showWeeklyGenerator && (
        <WeeklyPlanGenerator
          onGenerated={handleRefresh}
          onClose={() => setShowWeeklyGenerator(false)}
        />
      )}
    </div>
  );
}

export default App;
