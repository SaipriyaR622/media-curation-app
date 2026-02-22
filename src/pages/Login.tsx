import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

function normalizeIdentifier(identifier: string) {
  const trimmed = identifier.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("@")) {
    return trimmed;
  }

  const slug = trimmed.replace(/\s+/g, "");
  return slug ? `${slug}@fragments.local` : "";
}

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    let isActive = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (isActive && data.session) {
        navigate("/library/books", { replace: true });
      }
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/library/books", { replace: true });
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    if (!isSupabaseConfigured || !supabase) {
      navigate("/library/books");
      return;
    }

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage("Enter both username and password.");
      return;
    }

    const normalizedEmail = normalizeIdentifier(identifier);
    if (!normalizedEmail) {
      setErrorMessage("Enter a valid username.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }

    navigate("/library/books", { replace: true });
  };

  const handleSignUp = async () => {
    setErrorMessage("");
    setStatusMessage("");

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.");
      return;
    }

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage("Enter both username and password to create an account.");
      return;
    }

    const normalizedEmail = normalizeIdentifier(identifier);
    if (!normalizedEmail) {
      setErrorMessage("Enter a valid username.");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/library/books`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }

    if (data.session) {
      navigate("/library/books", { replace: true });
      return;
    }

    setStatusMessage("Account created. You can sign in now.");
    setSubmitting(false);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#eceae6] p-6">
      <div className="absolute inset-0 pointer-events-none opacity-20 blur-3xl">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-stone-400" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-stone-500" />
      </div>

      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-sm"
        >
          <div className="rounded-sm border border-stone-200 bg-[#fdfbf7] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
            <div className="mb-12 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400">Identity Verification</p>
                <h2 className="font-serif text-2xl font-medium italic text-stone-900">Private Archive</h2>
              </div>
              <ShieldCheck className="h-6 w-6 text-stone-300" />
            </div>

            <form onSubmit={(event) => void handleLogin(event)} className="space-y-10">
              <div className="group relative">
                <label className="absolute -top-6 left-0 text-[9px] font-bold uppercase tracking-widest text-stone-400">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="Enter username"
                  className="w-full border-b border-stone-300 bg-transparent py-2 font-serif text-lg placeholder:text-stone-200 focus:border-stone-800 focus:outline-none transition-colors"
                />
              </div>

              <div className="group relative">
                <label className="absolute -top-6 left-0 text-[9px] font-bold uppercase tracking-widest text-stone-400">
                  Passcode
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  className="w-full border-b border-stone-300 bg-transparent py-2 font-serif text-lg text-stone-800 placeholder:text-stone-200 focus:border-stone-800 focus:outline-none transition-colors"
                />
              </div>

              <motion.button
                whileHover={{ x: 5 }}
                type="submit"
                disabled={submitting}
                className="group flex items-center gap-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="font-serif italic text-stone-900 underline-offset-4 decoration-stone-300 group-hover:underline">
                  {submitting ? "Authorizing..." : "Grant access"}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-900 transition-all duration-300 group-hover:bg-stone-900 group-hover:text-white">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </motion.button>

              <button
                type="button"
                onClick={() => void handleSignUp()}
                disabled={submitting}
                className="text-xs uppercase tracking-[0.2em] text-stone-500 transition-colors hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create account
              </button>

              {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
              {statusMessage && <p className="text-xs text-stone-500">{statusMessage}</p>}
            </form>

            <div className="mt-12 border-t border-dashed border-stone-200 pt-6">
              <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-tighter text-stone-300">
                <span>Auth System v2.0</span>
                <span>Sequence: 099-23</span>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-4 left-4 right-4 -z-10 h-8 rounded-full bg-black/5 blur-xl" />
        </motion.div>
      </div>

      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
        }}
      />
    </div>
  );
}
