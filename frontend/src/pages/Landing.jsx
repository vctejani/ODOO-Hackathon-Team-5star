import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Truck, ShieldCheck, Compass, Gauge, BarChart3, 
  Wrench, Fuel, Users, ArrowRight, Layers, LayoutDashboard 
} from 'lucide-react';

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    {
      title: 'Vehicle Registry',
      desc: 'Track vehicle profiles, physical dimensions, license renewals, and availability status.',
      icon: Truck,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400',
    },
    {
      title: 'Driver Management',
      desc: 'Manage driver logs, license validity, safety scores, and shift allocations.',
      icon: Users,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
    },
    {
      title: 'Trip Dispatch & Tracking',
      desc: 'Create, dispatch, and track trips in real time with dynamic routing and status monitoring.',
      icon: Compass,
      color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/50 dark:text-violet-400',
    },
    {
      title: 'Fleet Maintenance',
      desc: 'Preventive service scheduling, breakdown logging, and vehicle diagnostics tracking.',
      icon: Wrench,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400',
    },
    {
      title: 'Fuel & Expense Management',
      desc: 'Monitor fuel logs, toll fees, driver payouts, and operational expenses per trip.',
      icon: Fuel,
      color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400',
    },
    {
      title: 'Reports & Analytics',
      desc: 'Generate comprehensive fleet reports, driver metrics, maintenance logs, and financial charts.',
      icon: BarChart3,
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400',
    },
    {
      title: 'Role-Based Access Control',
      desc: 'Tailored portals for Fleet Managers, Drivers, Safety Officers, and Financial Analysts.',
      icon: ShieldCheck,
      color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-400',
    },
    {
      title: 'Real-Time Dashboard',
      desc: 'Unified operational dashboard showing immediate indicators, active dispatches, and alerts.',
      icon: Gauge,
      color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-400',
    },
  ];

  const teamMembers = [
    {
      name: 'Kanetiya Tanuj Bharatbhai',
      initials: 'KT',
    },
    {
      name: 'Tejani Veer Chiragkumar',
      initials: 'TV',
    },
    {
      name: 'Gadhiya Dharm Odhavjibhai',
      initials: 'GD',
    },
    {
      name: 'Pillai Anurag Mohanbhai',
      initials: 'PA',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-brand-500/20 selection:text-brand-800">
      
      {/* Sticky Navigation Bar */}
      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b ${
        scrolled 
          ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-slate-200/80 dark:border-slate-800/80 shadow-sm py-4' 
          : 'bg-transparent border-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img 
              src="/favicon.png" 
              alt="Logo" 
              className="w-8 h-8 rounded-lg object-cover shadow-sm group-hover:scale-105 transition-transform" 
            />
            <span className="font-bold text-sm md:text-base text-slate-900 dark:text-white tracking-tight">
              5Star Smart Transport Operations Platform
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Home
            </a>
            <a 
              href="#problem-statement" 
              onClick={scrollToSection('problem-statement')}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              About
            </a>
            <a 
              href="#features" 
              onClick={scrollToSection('features')}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Features
            </a>
            <a 
              href="#team" 
              onClick={scrollToSection('team')}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Team
            </a>
            <Link 
              to="/login" 
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl transition-all shadow-sm hover:shadow active:scale-98"
            >
              Login
            </Link>
          </nav>
          
          {/* Mobile Login Button Shortcut */}
          <Link 
            to="/login" 
            className="md:hidden px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg transition-all"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-28 md:pt-36 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          
          {/* Left Content (60% desktop width) */}
          <div className="w-full lg:w-3/5 flex flex-col items-start text-left animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-none mb-6">
              <span>🚛</span> Smart Transport Management
            </div>
            
            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15] mb-4">
              5Star Smart Transport <br className="hidden sm:inline" />
              Operations Platform
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-8 font-medium leading-relaxed">
              Digitizing modern fleet operations through intelligent transport management.
            </p>

            {/* Problem Statement Summary */}
            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-2xl mb-8">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">Problem Statement</span>
              <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                Build an end-to-end transport operations platform that digitizes vehicle, driver, dispatch, maintenance, and expense management while enforcing business rules and providing operational insights.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <Link 
                to="/login"
                className="group flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all text-sm"
              >
                Get Started 
                <Truck size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a 
                href="#problem-statement"
                onClick={scrollToSection('problem-statement')}
                className="flex items-center justify-center gap-1.5 px-6 py-3.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold transition-colors text-sm"
              >
                Learn More 
                <ArrowRight size={16} className="rotate-90" />
              </a>
            </div>
          </div>

          {/* Right Visual (40% desktop width) */}
          <div className="w-full lg:w-2/5 flex justify-center animate-fade-in delay-200">
            <div className="relative w-full max-w-md lg:max-w-none">
              {/* Subtle background glow */}
              <div className="absolute inset-0 bg-blue-500/10 rounded-3xl blur-3xl -z-10" />
              
              <img 
                src="/landing_illustration.png" 
                alt="Logistics Operations Visual" 
                className="w-full h-auto object-contain rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-2xl"
              />
            </div>
          </div>

        </div>
      </section>

      {/* Detailed Challenge Description Section */}
      <section 
        id="problem-statement" 
        className="bg-slate-50 dark:bg-slate-900/40 border-y border-slate-200/50 dark:border-slate-800/50 py-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
          <div className="w-full lg:w-1/2 flex flex-col justify-center">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-2">The Challenge</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
              Spreadsheets and Manual Logs Stifle Operations
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              Many logistics companies still rely on spreadsheets and manual logbooks to manage transport operations. This often results in scheduling conflicts, underutilized vehicles, missed maintenance, expired driver licenses, inaccurate expense tracking, and poor operational visibility.
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Without centralized rules, dispatches get delayed, compliance risks accumulate, and operational costs climb unchecked.
            </p>
          </div>
          
          <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-2">Our Solution</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">
              A Unified Intelligent Ecosystem
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              The <strong>5Star Smart Transport Operations Platform</strong> centralizes fleet management by enabling organizations to efficiently manage vehicles, drivers, trips, maintenance, fuel usage, operational expenses, and analytics from a single intelligent dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {['Centralized Registry', 'Dynamic Dispatch', 'Rules Enforced', 'Instant Analytics'].map((tag) => (
                <span 
                  key={tag}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-2">Core Competencies</span>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            Optimized for Fleet Operators
          </h2>
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            Explore the powerful components designed to elevate logistics management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => {
            const IconComponent = f.icon;
            return (
              <div 
                key={i}
                className="group p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${f.color} transition-transform group-hover:scale-105 duration-300`}>
                  <IconComponent size={20} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Team Information Section */}
      <section 
        id="team" 
        className="py-20 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200/50 dark:border-slate-800/50 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto text-center animate-fade-in">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-2">Team 5Star</span>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            Development Team
          </h2>
          <p className="text-slate-600 dark:text-slate-400 font-medium max-w-xl mx-auto mb-12">
            The engineering team behind the 5Star Smart Transport Operations Platform.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((m, i) => (
              <div 
                key={i} 
                className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-5 shadow-lg shadow-blue-500/10 dark:shadow-none">
                  {m.initials}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {m.name}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="Logo" className="w-6 h-6 rounded-md object-cover" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-tight">
              5Star Smart Transport Operations Platform &copy; 2026
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-xs text-slate-400 dark:text-slate-600 font-medium">
              Hackathon Project Team 5Star
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
