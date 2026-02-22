import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Lenis from "lenis";
import { useEffect, type ReactNode, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Login from "./pages/Login";
import BookDetail from "./pages/BookDetail";
import { GlobalSearchPalette } from "./components/GlobalSearchPalette";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Movies from "./pages/Movies";
import Diary from "./pages/Diary";
import Songs from "./pages/Songs";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const queryClient = new QueryClient();

interface AuthRouteProps {
  authReady: boolean;
  isAuthenticated: boolean;
  children: ReactNode;
}

function ProtectedRoute({ authReady, isAuthenticated, children }: AuthRouteProps) {
  if (!isSupabaseConfigured) {
    return <>{children}</>;
  }

  if (!authReady) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function LoginRoute({ authReady, isAuthenticated }: Pick<AuthRouteProps, "authReady" | "isAuthenticated">) {
  if (!isSupabaseConfigured) {
    return <Login />;
  }

  if (!authReady) {
    return <div className="min-h-screen bg-background" />;
  }

  if (isAuthenticated) {
    return <Navigate to="/library/books" replace />;
  }

  return <Login />;
}

const App = () => {
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
    });

    let rafId = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };

    rafId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthReady(true);
      return;
    }

    let isActive = true;

    const hydrateAuthState = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isActive) {
        return;
      }

      setIsAuthenticated(Boolean(data.session));
      setAuthReady(true);
    };

    void hydrateAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) {
        return;
      }

      setIsAuthenticated(Boolean(session));
      setAuthReady(true);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GlobalSearchPalette />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<LoginRoute authReady={authReady} isAuthenticated={isAuthenticated} />} />
            <Route
              path="/library"
              element={
                <ProtectedRoute authReady={authReady} isAuthenticated={isAuthenticated}>
                  <Navigate to="/library/books" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/library/books"
              element={
                <ProtectedRoute authReady={authReady} isAuthenticated={isAuthenticated}>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/library/movies"
              element={
                <ProtectedRoute authReady={authReady} isAuthenticated={isAuthenticated}>
                  <Movies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/library/songs"
              element={
                <ProtectedRoute authReady={authReady} isAuthenticated={isAuthenticated}>
                  <Songs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/library/diary"
              element={
                <ProtectedRoute authReady={authReady} isAuthenticated={isAuthenticated}>
                  <Diary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/movies"
              element={
                <ProtectedRoute authReady={authReady} isAuthenticated={isAuthenticated}>
                  <Navigate to="/library/movies" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/songs"
              element={
                <ProtectedRoute authReady={authReady} isAuthenticated={isAuthenticated}>
                  <Navigate to="/library/songs" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/book/:id"
              element={
                <ProtectedRoute authReady={authReady} isAuthenticated={isAuthenticated}>
                  <BookDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute authReady={authReady} isAuthenticated={isAuthenticated}>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
