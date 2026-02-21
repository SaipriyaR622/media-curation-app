import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would normally handle your auth logic
    navigate('/library/books');
  };

  return (
    <div className="relative min-h-screen w-full bg-[#eceae6] flex flex-col items-center justify-center overflow-hidden p-6">
      
      {/* BACKGROUND DECOR (Same as Landing for continuity) */}
      <div className="absolute inset-0 pointer-events-none opacity-20 blur-3xl">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-stone-400 rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-stone-500 rounded-full" />
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* THE LOGIN CARD */}
        <div className="bg-[#fdfbf7] border border-stone-200 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm">
          
          {/* Header Area */}
          <div className="flex justify-between items-start mb-12">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold">Identity Verification</p>
              <h2 className="font-serif text-2xl text-stone-900 font-medium italic">Private Archive</h2>
            </div>
            <ShieldCheck className="text-stone-300 h-6 w-6" />
          </div>

          <form onSubmit={handleLogin} className="space-y-10">
            <div className="relative group">
              <label className="text-[9px] uppercase tracking-widest text-stone-400 font-bold absolute -top-6 left-0">
                Email Address
              </label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your credentials"
                className="w-full bg-transparent border-b border-stone-300 py-2 font-serif text-lg focus:outline-none focus:border-stone-800 transition-colors placeholder:text-stone-200"
              />
            </div>

            <div className="relative group">
              <label className="text-[9px] uppercase tracking-widest text-stone-400 font-bold absolute -top-6 left-0">
                Passcode
              </label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-transparent border-b border-stone-300 py-2 font-serif text-lg focus:outline-none focus:border-stone-800 transition-colors placeholder:text-stone-200 text-stone-800"
              />
            </div>

            <motion.button
              whileHover={{ x: 5 }}
              type="submit"
              className="flex items-center gap-3 group"
            >
              <span className="font-serif italic text-stone-900 group-hover:underline underline-offset-4 decoration-stone-300">
                Grant access
              </span>
              <div className="h-8 w-8 rounded-full border border-stone-900 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-300">
                <ArrowRight className="h-4 w-4" />
              </div>
            </motion.button>
          </form>

          {/* Card Footer Detail */}
          <div className="mt-12 pt-6 border-t border-dashed border-stone-200">
            <div className="flex justify-between items-center text-[8px] font-mono text-stone-300 uppercase tracking-tighter">
              <span>Auth System v2.0</span>
              <span>Sequence: 099-23</span>
            </div>
          </div>
        </div>

        {/* Subtle Shadow "Under" the card */}
        <div className="absolute -bottom-4 left-4 right-4 h-8 bg-black/5 blur-xl -z-10 rounded-full" />
      </motion.div>

      {/* GRAIN OVERLAY */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-50" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
    </div>
  );
}
