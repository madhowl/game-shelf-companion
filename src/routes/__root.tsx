import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AppLayout } from "@/components/app/Layout";
import { ThemeProvider } from "@/components/app/ThemeProvider";
import { SkinProvider } from "@/components/app/SkinProvider";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Meeple Vault — Board Game Collection Manager" },
      { name: "description", content: "Catalog, design and print board games. Manage series, expansions and components in a beautiful tabletop-inspired library." },
      { name: "author", content: "Meeple Vault" },
      { property: "og:title", content: "Meeple Vault — Board Game Collection Manager" },
      { property: "og:description", content: "Catalog, design and print board games with a tabletop-inspired library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var m=localStorage.getItem('meeple-vault-theme')||'system';var v=localStorage.getItem('meeple-vault-variant')||'tabletop';var s=localStorage.getItem('meeple-vault-skin')||'cabinet';var r=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;if(r==='dark'){d.classList.add('dark');}d.style.colorScheme=r;d.classList.remove('theme-tabletop','theme-modern','theme-neon');d.classList.add('theme-'+v);d.classList.remove('skin-cabinet','skin-workbench','skin-command');d.classList.add('skin-'+s);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ThemeProvider>
      <SkinProvider>
        <AppLayout>
          <Outlet />
        </AppLayout>
      </SkinProvider>
    </ThemeProvider>
  );
}
