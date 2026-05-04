import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { create } from 'zustand';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastViewport } from './ui/Toast';
import { MobileSidebar } from './MobileSidebar';

interface PageHeaderState {
  title: string;
  description?: string;
  actions?: ReactNode;
  set: (next: { title: string; description?: string; actions?: ReactNode }) => void;
}

export const usePageHeader = create<PageHeaderState>((set) => ({
  title: 'Overview',
  description: undefined,
  actions: undefined,
  set: (next) => set({ ...next }),
}));

export function Layout({ children }: { children?: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { title, description, actions } = usePageHeader();
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={title}
          description={description}
          actions={actions}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8 max-w-[1400px] w-full mx-auto">
          {children ?? <Outlet />}
        </main>
        <ToastViewport />
      </div>
    </div>
  );
}
