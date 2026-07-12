import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Eye, EyeOff, SkipForward } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/UI';
import { ROLE_HOME } from '../lib/permissions';

const demoAccounts = [
  { role: 'Fleet Manager', email: 'fleet@transitops.com' },
  { role: 'Driver', email: 'driver@transitops.com' },
  { role: 'Safety Officer', email: 'safety@transitops.com' },
  { role: 'Financial Analyst', email: 'finance@transitops.com' },
];

const frameCount = 180;

// Helper to interpolate opacity for text steps
const getStepOpacity = (progress, start, end) => {
  const peak = (start + end) / 2;
  if (progress < start || progress > end) return 0;
  if (progress < peak) {
    return (progress - start) / (peak - start);
  } else {
    return (end - progress) / (end - peak);
  }
};

export default function Login() {
  const [email, setEmail] = useState('fleet@transitops.com');
  const [password, setPassword] = useState('password123');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Scroll Animation States & Refs
  const [preloaded, setPreloaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isFinal, setIsFinal] = useState(false);
  const [images, setImages] = useState([]);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isFinalRef = useRef(false);
  const currentProgressRef = useRef(0);

  // Preload Images
  useEffect(() => {
    let loaded = 0;
    const loadedImages = [];
    
    // Safety fallback timeout to prevent being stuck on loader
    const timeoutId = setTimeout(() => {
      console.warn("Preload timeout reached. Proceeding...");
      setPreloaded(true);
    }, 6000);

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      const padNum = String(i).padStart(3, '0');
      img.src = `/frames/ezgif-frame-${padNum}.jpg`;
      img.onload = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === frameCount) {
          clearTimeout(timeoutId);
          setPreloaded(true);
        }
      };
      img.onerror = () => {
        // Treat errors as loaded so count continues
        loaded++;
        setLoadedCount(loaded);
        if (loaded === frameCount) {
          clearTimeout(timeoutId);
          setPreloaded(true);
        }
      };
      loadedImages.push(img);
    }
    setImages(loadedImages);

    return () => clearTimeout(timeoutId);
  }, []);

  // Frame scroll playback handler
  useEffect(() => {
    if (!preloaded || images.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const container = canvas.parentNode;

    const drawFrame = (progress) => {
      const frameIndex = Math.min(
        frameCount - 1,
        Math.floor(progress * frameCount)
      );
      const img = images[frameIndex];
      if (img && img.complete) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw image covering the canvas (object-fit: cover implementation in canvas)
        const canvasW = canvas.width / window.devicePixelRatio;
        const canvasH = canvas.height / window.devicePixelRatio;
        const imgW = img.width;
        const imgH = img.height;
        
        const imgRatio = imgW / imgH;
        const canvasRatio = canvasW / canvasH;
        
        let drawW, drawH, drawX, drawY;
        if (canvasRatio > imgRatio) {
          drawW = canvasW;
          drawH = canvasW / imgRatio;
          drawX = 0;
          drawY = (canvasH - drawH) / 2;
        } else {
          drawW = canvasH * imgRatio;
          drawH = canvasH;
          drawX = (canvasW - drawW) / 2;
          drawY = 0;
        }
        
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      }
    };

    const getScrollProgress = () => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      if (totalScrollable <= 0) return 0;
      const progress = -rect.top / totalScrollable;
      return Math.max(0, Math.min(1, progress));
    };

    // Calculate step text opacities dynamically
    const updateTextSteps = (progress) => {
      const step1El = document.getElementById('step-text-1');
      const step2El = document.getElementById('step-text-2');
      const step3El = document.getElementById('step-text-3');
      const scrollIndicatorEl = document.getElementById('scroll-indicator');

      const opacity1 = getStepOpacity(progress, 0.08, 0.28);
      const opacity2 = getStepOpacity(progress, 0.32, 0.52);
      const opacity3 = getStepOpacity(progress, 0.56, 0.76);

      if (step1El) {
        step1El.style.opacity = opacity1;
        step1El.style.transform = `translate(-50%, calc(-50% + ${(1 - opacity1) * 20}px))`;
        step1El.style.pointerEvents = opacity1 > 0.1 ? 'auto' : 'none';
      }
      if (step2El) {
        step2El.style.opacity = opacity2;
        step2El.style.transform = `translate(-50%, calc(-50% + ${(1 - opacity2) * 20}px))`;
        step2El.style.pointerEvents = opacity2 > 0.1 ? 'auto' : 'none';
      }
      if (step3El) {
        step3El.style.opacity = opacity3;
        step3El.style.transform = `translate(-50%, calc(-50% + ${(1 - opacity3) * 20}px))`;
        step3El.style.pointerEvents = opacity3 > 0.1 ? 'auto' : 'none';
      }
      if (scrollIndicatorEl) {
        scrollIndicatorEl.style.opacity = progress > 0.05 ? '0' : '1';
        scrollIndicatorEl.style.pointerEvents = progress > 0.05 ? 'none' : 'auto';
      }
    };

    // Resize observer to update canvas dimensions dynamically
    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      drawFrame(currentProgressRef.current);
    });

    // Handle scroll events with rAF
    const handleScroll = () => {
      requestAnimationFrame(() => {
        const progress = getScrollProgress();
        currentProgressRef.current = progress;
        drawFrame(progress);
        updateTextSteps(progress);

        if (progress >= 0.8) {
          if (!isFinalRef.current) {
            isFinalRef.current = true;
            setIsFinal(true);
          }
        } else {
          if (isFinalRef.current) {
            isFinalRef.current = false;
            setIsFinal(false);
          }
        }
      });
    };

    resizeObserver.observe(container);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial draw call
    handleScroll();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [preloaded, images]);

  const skipToLogin = () => {
    if (!containerRef.current) return;
    const totalScroll = containerRef.current.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: totalScroll,
      behavior: 'smooth',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(ROLE_HOME[loggedInUser.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (!preloaded) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-white z-50 overflow-hidden">
        {/* Background glowing blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse delay-700" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-sm px-6">
          <div className="flex items-center gap-3 mb-8 animate-bounce">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Truck size={28} className="text-white" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Initializing TransitOps
          </h2>
          <p className="text-sm text-slate-400 mb-8 max-w-xs">
            Loading operational dashboard & interactive 3D assets...
          </p>
          
          {/* Glowing Progress bar */}
          <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden relative mb-3">
            <div 
              className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
              style={{ width: `${Math.round((loadedCount / frameCount) * 100)}%` }}
            />
          </div>
          
          <span className="text-sm font-semibold tracking-wider text-brand-400">
            {Math.round((loadedCount / frameCount) * 100)}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative min-h-[350vh] bg-slate-950 text-slate-100 selection:bg-brand-500/30 selection:text-white">
      {/* Skip Button */}
      {!isFinal && (
        <button 
          onClick={skipToLogin}
          className="fixed top-6 right-6 z-40 flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-full backdrop-blur-md transition-all shadow-lg hover:shadow-white/5 active:scale-95 cursor-pointer"
        >
          Skip to Sign In <SkipForward size={14} />
        </button>
      )}

      {/* Sticky viewport */}
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden flex bg-slate-950">
        
        {/* Left Side: Scroll Animation */}
        <div className={`relative h-full flex-shrink-0 transition-all duration-1000 ease-in-out ${isFinal ? 'w-full lg:w-1/2' : 'w-full'}`}>
          <canvas ref={canvasRef} className="w-full h-full object-cover opacity-90" />
          
          {/* Dark overlay for canvas */}
          <div className={`absolute inset-0 bg-slate-950/25 pointer-events-none transition-opacity duration-1000 ${isFinal ? 'lg:bg-slate-950/50' : ''}`} />

          {/* Scroll Indicator */}
          <div 
            id="scroll-indicator" 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none transition-all duration-500 animate-bounce"
          >
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Scroll to Explore</span>
            <div className="w-6 h-10 border-2 border-slate-500 rounded-full flex justify-center p-1">
              <div className="w-1.5 h-3 bg-accent-400 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Text Overlay Steps */}
          <div 
            id="step-text-1" 
            style={{ opacity: 0 }} 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-md text-center pointer-events-none transition-all duration-300 bg-slate-950/75 border border-white/10 backdrop-blur-md py-6 px-8 rounded-3xl"
          >
            <span className="text-xs font-semibold tracking-widest text-brand-400 uppercase mb-2 block">Cockpit</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Digitize Fleet Operations
            </h2>
            <p className="mt-2 text-slate-300 text-xs md:text-sm">
              Manage vehicles, drivers, and expenses from a single, unified cockpit.
            </p>
          </div>

          <div 
            id="step-text-2" 
            style={{ opacity: 0 }} 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-md text-center pointer-events-none transition-all duration-300 bg-slate-950/75 border border-white/10 backdrop-blur-md py-6 px-8 rounded-3xl"
          >
            <span className="text-xs font-semibold tracking-widest text-accent-400 uppercase mb-2 block">Scheduling</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Smart Dispatch Engine
            </h2>
            <p className="mt-2 text-slate-300 text-xs md:text-sm">
              Assign trips intelligently, minimize empty-miles, and track routes in real time.
            </p>
          </div>

          <div 
            id="step-text-3" 
            style={{ opacity: 0 }} 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-md text-center pointer-events-none transition-all duration-300 bg-slate-950/75 border border-white/10 backdrop-blur-md py-6 px-8 rounded-3xl"
          >
            <span className="text-xs font-semibold tracking-widest text-brand-400 uppercase mb-2 block">Safety</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Telematics & Safety Logs
            </h2>
            <p className="mt-2 text-slate-300 text-xs md:text-sm">
              Monitor diagnostic reports, track maintenance, and enforce high safety standards.
            </p>
          </div>
        </div>

        {/* Right Side: Login Panel */}
        <div 
          className={`flex-shrink-0 transition-all duration-1000 ease-in-out ${isFinal ? 'opacity-100 w-full lg:w-1/2 pointer-events-auto' : 'opacity-0 w-0 pointer-events-none'} absolute lg:relative inset-0 lg:inset-auto z-20 flex items-center justify-center px-6 py-12 bg-slate-950/75 lg:bg-slate-50 lg:dark:bg-slate-950 backdrop-blur-md lg:backdrop-blur-none`}
        >
          <div className={`w-full max-w-md transition-all duration-1000 transform ${isFinal ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
                <Truck size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white">TransitOps</span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 font-sans">Welcome back</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Sign in to your account to continue</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <div className="relative">
                  <Input label="Password" type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full py-3 cursor-pointer" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Demo Accounts</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {demoAccounts.map((a) => (
                     <button
                       key={a.email}
                       type="button"
                       onClick={() => { setEmail(a.email); setPassword('password123'); }}
                       className="flex flex-col items-start px-3 py-2 rounded-xl text-left bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
                     >
                       <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{a.role}</span>
                       <span className="text-[10px] text-slate-400 truncate w-full">{a.email}</span>
                     </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-4 text-center">Password: password123</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
