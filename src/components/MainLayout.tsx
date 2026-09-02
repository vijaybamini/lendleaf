import { MobileBottomNav } from "@/components/MobileBottomNav";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto min-h-[calc(100dvh-7rem)] w-full max-w-6xl pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <MobileBottomNav />
    </div>
  );
}
