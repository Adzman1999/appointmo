import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Sparkles, Shield, Clock, CheckCircle2, 
  ChevronRight, ArrowRight, Building2, UserCheck, Search, SlidersHorizontal, Plus 
} from 'lucide-react';
import { SHOW_PRODUCTION_AUTH } from '../config';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { BusinessCreationModal } from '../components/BusinessCreationModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { DemoTopNav } from '../components/DemoTopNav';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 selection:bg-stone-200 dark:selection:bg-stone-800 transition-colors">
      {/* Top Demo Navigation Bar with Direct Reset Button */}
      <DemoTopNav currentRole="customer" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <AppointmoLogo size="md" subtitle="Intelligent Scheduling" />
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-stone-600 dark:text-stone-300">
            <button
              onClick={() => navigate('/browse')}
              className="hover:text-stone-900 dark:hover:text-white transition-colors text-stone-800 dark:text-stone-200 font-semibold text-sm flex items-center space-x-1"
            >
              <span>Explore Businesses</span>
            </button>
            <a href="#how-it-works" className="hover:text-stone-900 dark:hover:text-white transition-colors">How It Works</a>
            <a href="#concierge" className="hover:text-stone-900 dark:hover:text-white transition-colors">Concierge Booking</a>
            <button
              onClick={() => navigate('/manage')}
              className="hover:text-stone-900 dark:hover:text-white transition-colors text-stone-700 dark:text-stone-300 font-medium text-sm"
            >
              Manage Booking
            </button>
            {SHOW_PRODUCTION_AUTH && (
              <button
                onClick={() => navigate('/admin/login')}
                className="hover:text-stone-900 dark:hover:text-white transition-colors text-stone-800 dark:text-stone-200 font-semibold text-xs"
              >
                Sign In
              </button>
            )}
          </nav>

          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-semibold text-xs hover:bg-amber-200 dark:hover:bg-amber-900/80 transition shadow-sm"
              title="Launch a new business and take appointments"
            >
              <Plus className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
              <span>Create Business</span>
            </button>
            <button
              onClick={() => navigate('/demo/admin')}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold text-xs hover:bg-stone-50 dark:hover:bg-stone-700 transition shadow-sm"
            >
              <Building2 className="w-3.5 h-3.5 text-stone-500" />
              <span>Admin Demo</span>
            </button>
            <button
              onClick={() => navigate('/demo/book')}
              className="bg-stone-900 text-white font-semibold px-4 py-2 rounded-xl hover:bg-stone-800 transition text-xs shadow-sm flex items-center space-x-1"
            >
              <span>Book Appointment</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 sm:py-28 max-w-5xl mx-auto px-4 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Interactive Demo Platform • Zero Registration Required</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-stone-900 dark:text-stone-50 mb-6 leading-tight">
          Intelligent, guided appointment scheduling for any service business.
        </h1>

        <p className="text-base sm:text-lg text-stone-700 dark:text-stone-200 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Designed for studios, clinics, salons, wellness centres, and professional services. Explore Appointmo with synthetic data right now — featuring two-way live sync and instant self-service appointment management.
        </p>

        {/* Primary Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm font-semibold">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 px-7 py-3.5 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow"
          >
            <Plus className="w-4 h-4 text-amber-300 dark:text-stone-950" />
            <span>Create Your Business</span>
          </button>

          <button
            onClick={() => navigate('/demo/admin')}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 px-7 py-3.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition shadow-sm"
          >
            <Building2 className="w-4 h-4 text-stone-500 dark:text-stone-400" />
            <span>Explore Admin Demo</span>
          </button>

          <button
            onClick={() => navigate('/browse')}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 px-7 py-3.5 rounded-xl transition"
          >
            <span>Browse Directory &amp; Book</span>
            <ArrowRight className="w-4 h-4 text-stone-500 dark:text-stone-400" />
          </button>
        </div>
      </section>

      {/* Differentiator Highlight: Concierge Booking */}
      <section id="concierge" className="py-12 max-w-5xl mx-auto px-4">
        <div className="bg-gradient-to-br from-amber-50/80 via-white to-stone-50 dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 border border-amber-200/80 dark:border-stone-800 rounded-3xl p-8 sm:p-12 shadow-sm">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-xs font-semibold mb-4 border border-amber-300/40 dark:border-amber-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>The Appointmo Advantage</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50 mb-3">
              "Not sure what to book? Tell us what you need, and we'll help you find the right service and time."
            </h2>
            <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed mb-6 font-normal">
              Instead of forcing customers to interpret a complex service catalogue, Appointmo's Concierge interprets preferences, specialized needs, and budget in natural language, matching them directly to genuine calendar openings.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/demo/concierge')}
                className="bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold px-5 py-3 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300 dark:text-stone-950" />
                <span>Help Me Find the Right Appointment</span>
              </button>
              <button
                onClick={() => navigate('/demo/book')}
                className="bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold px-4 py-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition"
              >
                Or use Quick Booking
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-16 max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50">Two Seamless Demo Experiences</h2>
          <p className="text-xs text-stone-600 dark:text-stone-300 mt-2 font-medium">Connected in real-time through an isolated synthetic PostgreSQL database.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admin Demo Card */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 shadow-sm space-y-4 hover:border-stone-400 dark:hover:border-stone-700 transition">
            <div className="w-10 h-10 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5 text-stone-700 dark:text-stone-200" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-50">Admin Operations Demo</h3>
            <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
              Experience the complete business operations dashboard: real-time revenue, incoming appointment feed, status approvals, reschedule coordination, and instant synchronization.
            </p>
            <ul className="text-xs text-stone-700 dark:text-stone-300 space-y-2 pt-2 font-medium">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Live dashboard metrics from 125 persisted records</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>One-click status management (Complete, Cancel, Confirm)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Deterministic customer and store-level scheduling</span>
              </li>
            </ul>
            <div className="pt-4">
              <button
                onClick={() => navigate('/demo/admin')}
                className="w-full py-2.5 rounded-xl bg-stone-900 dark:bg-stone-800 text-white text-xs font-semibold hover:bg-stone-800 dark:hover:bg-stone-700 border border-transparent dark:border-stone-700 transition"
              >
                Launch Admin Demo &rarr;
              </button>
            </div>
          </div>

          {/* Customer Demo Card */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 shadow-sm space-y-4 hover:border-stone-400 dark:hover:border-stone-700 transition">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-50">Customer Booking &amp; Self-Management</h3>
            <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
              Book appointments directly with genuine availability, then reschedule or cancel anytime through the private self-service portal.
            </p>
            <ul className="text-xs text-stone-700 dark:text-stone-300 space-y-2 pt-2 font-medium">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Quick Booking with instant service selection</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Natural-language Concierge discovery</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Full self-service management (reschedule &amp; cancel anytime)</span>
              </li>
            </ul>
            <div className="pt-4">
              <button
                onClick={() => navigate('/demo/book')}
                className="w-full py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-800 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-700 transition"
              >
                Launch Customer Demo &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-10 bg-white dark:bg-stone-900 text-xs text-stone-600 dark:text-stone-300">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <AppointmoLogo size="sm" showText={false} />
            <span className="font-semibold text-stone-900 dark:text-stone-100">Appointmo</span>
            <span className="text-stone-600 dark:text-stone-300">— Intelligent Scheduling Platform. Powered by Concierge Discovery.</span>
          </div>
          <div className="flex space-x-6 text-[11px] text-stone-500 dark:text-stone-400">
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>
        </div>
      </footer>
      {/* Business Setup Wizard Modal */}
      <BusinessCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newBiz) => {
          setIsCreateModalOpen(false);
          navigate(`/demo/admin?slug=${encodeURIComponent(newBiz.slug)}`);
        }}
      />
    </div>
  );
};
