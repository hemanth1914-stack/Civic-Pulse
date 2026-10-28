import { useState } from 'react';
import {
  MapPin,
  Radio,
  FilePlus2,
  FolderClock,
  UserCheck,
} from 'lucide-react';
import { getOrCreateDeviceId, getOrCreateReporterLabel } from './lib/device';
import { theme } from './lib/theme';
import ReportIssue from './components/ReportIssue';
import CommunityFeed from './components/CommunityFeed';
import './App.css';

export type TabType = 'raise' | 'feed' | 'my-complaints';

export function App() {
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());
  const [reporterLabel] = useState<string>(() => getOrCreateReporterLabel());
  const [activeTab, setActiveTab] = useState<TabType>('raise');

  return (
    <div className={theme.surface.app}>
      {/* Fixed SaaS Top Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Brandmark */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <MapPin className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900 tracking-tight">
                    CivicPulse
                  </span>
                  <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80">
                    Bengaluru
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-normal">
                  Citizen Reporting & Escalation Gateway
                </span>
              </div>
            </div>

            {/* Friendly Anonymous Public Identity Badge */}
            {reporterLabel && (
              <div className="flex items-center gap-2">
                <div
                  title={`Device ID: ${deviceId}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-slate-100 text-slate-700 border border-slate-200/90 font-medium"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-slate-500 hidden sm:inline">Identity:</span>
                  <span className="font-semibold text-slate-900">
                    {reporterLabel}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Underline Tabs: Raise Complaint | Community Feed | My Complaints */}
          <nav className={theme.tabs.container} aria-label="Main Navigation">
            <button
              type="button"
              onClick={() => setActiveTab('raise')}
              className={activeTab === 'raise' ? theme.tabs.active : theme.tabs.inactive}
            >
              <FilePlus2 className="w-4 h-4" />
              Raise Complaint
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={activeTab === 'feed' ? theme.tabs.active : theme.tabs.inactive}
            >
              <Radio className="w-4 h-4" />
              Community Feed
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('my-complaints')}
              className={
                activeTab === 'my-complaints' ? theme.tabs.active : theme.tabs.inactive
              }
            >
              <FolderClock className="w-4 h-4" />
              My Complaints
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content View Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'raise' ? (
          <ReportIssue
            deviceId={deviceId}
            reporterLabel={reporterLabel}
            onReportSuccess={() => setActiveTab('my-complaints')}
          />
        ) : activeTab === 'feed' ? (
          <CommunityFeed
            deviceId={deviceId}
            mode="all"
            onNavigateToRaise={() => setActiveTab('raise')}
          />
        ) : (
          <CommunityFeed
            deviceId={deviceId}
            mode="mine"
            onNavigateToRaise={() => setActiveTab('raise')}
          />
        )}
      </main>

      {/* Enterprise Subtle Footer */}
      <footer className="border-t border-slate-200/90 bg-white py-6 text-center text-xs text-slate-500 mt-16">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Civic Service Escalation Gateway</span>
            <span className="text-slate-300">&middot;</span>
            <span>Anonymous Citizen Verification Active</span>
          </div>
          <div className="text-slate-400">
            BBMP &middot; BESCOM &middot; BWSSB Simulated Network
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
