import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TRPCProvider } from "@/lib/trpc-provider";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TRPCProvider>
      <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
        <Header />
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-5 pb-24">
          {children}
        </main>
        <BottomNav />
      </div>
    </TRPCProvider>
  );
}
