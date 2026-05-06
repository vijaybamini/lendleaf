import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  Link,
  useLocation,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthLoadingScreen } from "@/components/AuthLoadingScreen";
import { AuthProvider, useAuth } from "@/lib/auth";
import { MainLayout } from "@/components/MainLayout";
import appCss from "../styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-serif text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-serif text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page seems to be missing from our library.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "lending application" },
      {
        name: "description",
        content:
          "A peer-to-peer book sharing community. Lend, borrow, and discover books from neighbors and friends.",
      },
      { property: "og:title", content: "lending application" },
      {
        property: "og:description",
        content:
          "A peer-to-peer book sharing community. Lend, borrow, and discover books from neighbors and friends.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "lending application" },
      {
        name: "twitter:description",
        content:
          "A peer-to-peer book sharing community. Lend, borrow, and discover books from neighbors and friends.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/afebd24c-8640-4e48-8b85-0124640277a0/id-preview-6854c9a3--b23741ea-ebce-431e-b8a3-52e27976b0d4.lovable.app-1777136967382.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/afebd24c-8640-4e48-8b85-0124640277a0/id-preview-6854c9a3--b23741ea-ebce-431e-b8a3-52e27976b0d4.lovable.app-1777136967382.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const htmlElement = document.documentElement;
    return (
      htmlElement.classList.contains("dark") ||
      htmlElement.getAttribute("data-theme") === "dark" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });

  useEffect(() => {
    const htmlElement = document.documentElement;
    const applyTheme = (dark: boolean) => {
      if (dark) {
        htmlElement.setAttribute("data-theme", "dark");
        htmlElement.classList.add("dark");
      } else {
        htmlElement.removeAttribute("data-theme");
        htmlElement.classList.remove("dark");
      }
    };

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
    applyTheme(prefersDark);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
      applyTheme(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <html
      suppressHydrationWarning
      lang="en"
      data-theme={isDark ? "dark" : undefined}
      className={isDark ? "dark" : undefined}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var e=document.documentElement;if(d){e.setAttribute('data-theme','dark');e.classList.add('dark')}else{e.removeAttribute('data-theme');e.classList.remove('dark')}}catch(e){}})();",
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthGuard() {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  const isAuthRoute = location.pathname === "/login" || location.pathname === "/signup";

  if (user && !isAuthRoute) {
    return (
      <MainLayout>
        <Outlet />
      </MainLayout>
    );
  }

  return (
    <Outlet />
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGuard />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
