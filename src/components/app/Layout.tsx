import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Library, Layers, FileJson, Printer, ScanLine, Dices } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/app/ThemeProvider";
import { useSkin } from "@/components/app/SkinProvider";
import { useT } from "@/lib/i18n/I18nProvider";

const NAV = [
  { to: "/", labelKey: "nav.library", icon: Library, exact: true },
  { to: "/templates", labelKey: "nav.templates", icon: Layers, exact: false },
  { to: "/print", labelKey: "nav.print", icon: Printer, exact: false },
  { to: "/ocr", labelKey: "nav.ocr", icon: ScanLine, exact: false },
  { to: "/data", labelKey: "nav.data", icon: FileJson, exact: false },
] as const;

function useNav() {
  const t = useT();
  return NAV.map((n) => ({ ...n, label: t(n.labelKey) }));
}

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
  const { skin } = useSkin();
  if (skin === "workbench") return <WorkbenchLayout>{children}</WorkbenchLayout>;
  if (skin === "command") return <CommandLayout>{children}</CommandLayout>;
  return <CabinetLayout>{children}</CabinetLayout>;
}

function CabinetLayout({ children }: { children?: ReactNode }) {
  const t = useT();
  const nav = useNav();
  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/60 backdrop-blur">
        <div className="px-5 py-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-md flex items-center justify-center wood-surface shadow-[var(--shadow-card)]">
              <Dices className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-xl leading-none">{t("layout.title")}</div>
              <div className="text-[11px] text-muted-foreground tracking-widest uppercase mt-1">
                {t("layout.subtitle")}
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
          <div className="text-[11px] text-muted-foreground">{t("layout.footer")}</div>
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

function WorkbenchLayout({ children }: { children?: ReactNode }) {
  const t = useT();
  const nav = useNav();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border wood-surface shadow-[var(--shadow-card)]">
        <div className="px-6 py-3 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-md flex items-center justify-center bg-background/15 border border-background/20">
              <Dices className="h-5 w-5" />
            </div>
            <div className="font-display text-xl leading-none">{t("layout.title")}</div>
          </Link>
          <nav className="flex gap-1 overflow-x-auto flex-1">
            {nav.map((n) => {
              const Icon = n.icon;
              return (
                <TabItem key={n.to} to={n.to} exact={n.exact}>
                  <Icon className="h-4 w-4" /> {n.label}
                </TabItem>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 min-w-0">{children ?? <Outlet />}</main>
    </div>
  );
}

function TabItem({ to, exact, children }: { to: string; exact?: boolean; children: ReactNode }) {
  const { location } = useRouterState();
  const active = exact ? location.pathname === to : location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={[
        "inline-flex items-center gap-2 px-4 py-2 text-sm rounded-t-md border-b-2 -mb-px transition-colors",
        active
          ? "border-accent text-background bg-background/10"
          : "border-transparent text-background/70 hover:text-background hover:bg-background/10",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function CommandLayout({ children }: { children?: ReactNode }) {
  const { location } = useRouterState();
  const nav = useNav();
  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-16 flex-col items-center border-r border-border bg-card/60 py-4 gap-2">
        <Link
          to="/"
          className="h-10 w-10 rounded-md flex items-center justify-center wood-surface mb-2"
          title={"Meeple Vault"}
        >
          <Dices className="h-5 w-5" />
        </Link>
        {nav.map((n) => {
          const Icon = n.icon;
          const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              title={n.label}
              className={[
                "h-10 w-10 rounded-md flex items-center justify-center transition-colors",
                active
                  ? "bg-accent/20 text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
        <div className="mt-auto"><ThemeToggle /></div>
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
