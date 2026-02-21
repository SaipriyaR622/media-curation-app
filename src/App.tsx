import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Lenis from "lenis";
import { useEffect } from "react";
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

const queryClient = new QueryClient();

const App = () => {
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
              <Route path="/login" element={<Login />} />
              <Route path="/library" element={<Navigate to="/library/books" replace />} />
              <Route path="/library/books" element={<Index />} />
              <Route path="/library/movies" element={<Movies />} />
              <Route path="/library/songs" element={<Songs />} />
              <Route path="/library/diary" element={<Diary />} />
              <Route path="/movies" element={<Navigate to="/library/movies" replace />} />
              <Route path="/songs" element={<Navigate to="/library/songs" replace />} />
              <Route path="/book/:id" element={<BookDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
