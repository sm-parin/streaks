import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";

/**
 * Shell layout for all authenticated pages.
 * Renders the top header, the page content in a scrollable main area,
 * and the fixed bottom navigation tab bar.
 *
 * The pb-24 on <main> creates space so content is never hidden behind the nav.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <Header />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-5 pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
