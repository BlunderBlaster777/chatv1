'use client';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-discord-bg">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed md:relative z-30 md:z-auto h-full transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex md:hidden items-center px-3 py-2 bg-discord-sidebar border-b border-black/30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-discord-muted hover:text-white text-xl mr-3"
          >
            ☰
          </button>
          <span className="text-white font-semibold text-sm">Mini-Discord</span>
        </div>
        {children}
      </div>
    </div>
  );
}
