import Image from "next/image";
import Link from "next/link";
import AppNav from "@/components/nav/app-nav";
import { PageContainer } from "@/components/ui/page-container";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppNav />

      {/* Mobile header — logo bar, hidden on desktop */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b border-divider flex items-center justify-center px-6"
        style={{ background: "#F5F0E8", height: "64px" }}
      >
        <Link href="/">
          <Image
            src="/logo-crop.png"
            alt="Vibe Caddie"
            width={1200}
            height={420}
            className="h-[48px] w-auto"
            priority
          />
        </Link>
      </header>

      {/* Main content: sidebar offset on desktop, top+bottom offset on mobile */}
      <main className="lg:ml-[240px] pt-[64px] lg:pt-0 pb-20 lg:pb-0">
        <PageContainer>
          {children}
        </PageContainer>
      </main>
    </div>
  );
}
