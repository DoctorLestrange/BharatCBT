import React from 'react';
import { CBTExamRunner } from './components/cbt/CBTExamRunner';
import { Navbar } from './components/common/Navbar';
import { ToastContainer } from './components/common/Toast';
import { AttemptResults } from './components/studio/AttemptResults';
import { BookmarksView } from './components/studio/BookmarksView';
import { Dashboard } from './components/studio/Dashboard';
import { ExamBuilder } from './components/studio/ExamBuilder';
import { HistoryView } from './components/studio/HistoryView';
import { JsonFormatGuide } from './components/studio/JsonFormatGuide';
import { SettingsView } from './components/studio/SettingsView';
import { AppProvider, useApp } from './context/AppContext';

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const AppRouter: React.FC = () => {
  const { ready, route, exams, activeSessions, navigate } = useApp();

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 dark:bg-neutral-950">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600 dark:border-orange-950 dark:border-t-orange-500" />
        <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-neutral-300">
          Loading BharatCBT Exam Workspace...
        </p>
      </div>
    );
  }

  const [pathname, queryStr = ''] = route.split('?');
  const params = new URLSearchParams(queryStr);

  // Full-screen CBT Runner route (no portal navbar)
  if (pathname.startsWith('/exam/')) {
    const examId = safeDecodeURIComponent(pathname.slice('/exam/'.length));
    const exam = exams.find((e) => e.id === examId);
    const forceFresh = params.get('fresh') === '1';
    const existingSession = activeSessions.find((s) => s.examId === examId);

    if (!exam) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center dark:bg-neutral-950">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Exam Not Found</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            The requested exam does not exist in local storage.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Back to Dashboard
          </button>
        </div>
      );
    }

    return (
      <>
        <CBTExamRunner
          key={exam.id}
          exam={exam}
          existingSession={existingSession}
          forceFresh={forceFresh}
        />
        <ToastContainer />
      </>
    );
  }

  // Studio / Portal Views
  const renderStudioPage = () => {
    if (pathname === '/' || pathname === '') return <Dashboard />;
    if (pathname === '/builder') return <ExamBuilder key="new" />;
    if (pathname.startsWith('/builder/')) {
      const editId = safeDecodeURIComponent(pathname.slice('/builder/'.length));
      return <ExamBuilder key={editId} examId={editId} />;
    }
    if (pathname === '/format') return <JsonFormatGuide />;
    if (pathname.startsWith('/results/')) {
      const attId = safeDecodeURIComponent(pathname.slice('/results/'.length));
      return <AttemptResults attemptId={attId} />;
    }
    if (pathname === '/history') return <HistoryView />;
    if (pathname === '/bookmarks') return <BookmarksView />;
    if (pathname === '/settings') return <SettingsView />;
    return <Dashboard />;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
      <Navbar />
      <main className="pb-12">{renderStudioPage()}</main>
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

export default App;
