import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Library, Layers, FileJson, Printer, ScanLine, Dices } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/app/ThemeProvider";

const nav = [
  { to: "/", label: "Library", icon: Library, exact: true },
  { to: "/templates", label: "Components", icon: Layers },
  { to: "/print", label: "Print Sheets", icon: Printer },
  { to: "/ocr", label: "Card OCR", icon: ScanLine },
  { to: "/data", label: "Import / Export", icon: FileJson },
] as const;

function NavItem({ to, label, icon: Icon, exact }: { to: string; label: string; icon: any; exact?: boolean }) {
  const { location } = useRouterState();
  const active = exact ? location.pathname === to : location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={[
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent/20 text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

export function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/60 backdrop-blur">
        <div className="px-5 py-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-md flex items-center justify-center wood-surface shadow-[var(--shadow-card)]">
              <Dices className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-xl leading-none">Meeple Vault</div>
              <div className="text-[11px] text-muted-foreground tracking-widest uppercase mt-1">
                Collection Manager
              </div>
            </div>
          </Link>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {nav.map((n) => (
            <NavItem key={n.to} {...n} />
          ))}
        </nav>
        <div className="p-4 border-t border-border flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground">
            Local-first · Stored in your browser
          </div>
          <ThemeToggle />
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden border-b border-border bg-card/80 backdrop-blur p-3 flex items-center gap-2">
          <div className="flex gap-2 overflow-x-auto flex-1">
            {nav.map((n) => (
              <NavItem key={n.to} {...n} />
            ))}
          </div>
          <ThemeToggle />
        </div>
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
