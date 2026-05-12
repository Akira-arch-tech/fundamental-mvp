import Link from "next/link";
import { storePath } from "@/lib/storefront-constants";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-zinc-50 to-white text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/ja" className="text-lg font-bold tracking-tight text-[#e85c22]">
            FUNDAMENTAL
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm font-medium text-zinc-700">
            <a href="#acrylic" className="hover:text-[#e85c22]">
              アクリル特集
            </a>
            <a href="#inquiry" className="hover:text-[#e85c22]">
              お見積り
            </a>
            <Link href={storePath("/favorite")} className="text-zinc-500 hover:text-[#e85c22]">
              デモストア
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="mt-auto border-t border-zinc-200 bg-white py-8 text-center text-xs text-zinc-500">
        <p className="mx-auto max-w-lg px-4 leading-relaxed">
          © {new Date().getFullYear()} FUNDAMENTAL · お問い合わせはフォームより承ります。
        </p>
      </footer>
    </div>
  );
}
