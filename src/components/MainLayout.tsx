import { MobileBottomNav } from "@/components/MobileBottomNav";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#070a0f] text-zinc-50">
      <main className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto overscroll-contain pb-8">
        {children}
      </main>

      <MobileBottomNav />
    </div>
  );
}
