import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Sparkles, Shield, Clock, CheckCircle2, 
  ChevronRight, ArrowRight, Building2, UserCheck, Search, SlidersHorizontal, Plus 
} from 'lucide-react';
import { SHOW_PRODUCTION_AUTH } from '../config';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { BusinessCreationModal } from '../components/BusinessCreationModal';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 selection:bg-stone-200">
      {/* Top Banner introducing Fictional Demo Environment */}
      <div className="bg-stone-900 text-stone-300 py-2 px-4 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-semibold text-white">Demo-First Showcase:</span>
            <span>Explore both Admin and Customer experiences immediately with synthetic demo data.</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/demo/admin')}
              className="text-white hover:text-amber-300 font-medium underline text-xs"
            >
              Open Admin Demo &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <AppointmoLogo size="md" subtitle="Intelligent Scheduling" />
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-stone-600">
            <button
              onClick={() => navigate('/browse')}
              className="hover:text-stone-900 transition-colors text-stone-800 font-semibold text-sm flex items-center space-x-1"
            >
              <span>Explore Businesses</span>
            </button>
            <a href="#how-it-works" className="hover:text-stone-900 transition-colors">How It Works</a>
            <a href="#concierge" className="hover:text-stone-900 transition-colors">Concierge Booking</a>
            <button
              onClick={() => navigate('/manage')}
              className="hover:text-stone-900 transition-colors text-stone-700 font-medium text-sm"
            >
              Manage Booking
            </button>
            {SHOW_PRODUCTION_AUTH && (
              <button
                onClick={() => navigate('/admin/login')}
                className="hover:text-stone-900 transition-colors text-stone-800 font-semibold text-xs"
              >
                Sign In
              </button>
            )}
          </nav>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-xs hover:bg-amber-200 transition shadow-sm"
              title="Launch a new business and take appointments"
            >
              <Plus className="w-3.5 h-3.5 text-amber-700" />
              <span>Create Business</span>
            </button>
            <button
              onClick={() => navigate('/demo/admin')}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-stone-800 font-semibold text-xs hover:bg-stone-50 transition shadow-sm"
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
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Interactive Demo Platform • Zero Registration Required</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-stone-900 mb-6 leading-tight">
          Intelligent, guided appointment scheduling for any service business.
        </h1>

        <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Designed for studios, clinics, salons, wellness centres, and professional services. Explore Appointmo with synthetic data right now — featuring two-way live sync and instant self-service appointment management.
        </p>

        {/* Primary Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm font-semibold">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-stone-900 text-white px-7 py-3.5 rounded-xl hover:bg-stone-800 transition shadow"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>Create Your Business</span>
          </button>

          <button
            onClick={() => navigate('/demo/admin')}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white text-stone-800 border border-stone-300 px-7 py-3.5 rounded-xl hover:bg-stone-50 transition shadow-sm"
          >
            <Building2 className="w-4 h-4 text-stone-500" />
            <span>Explore Admin Demo</span>
          </button>

          <button
            onClick={() => navigate('/browse')}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200 px-7 py-3.5 rounded-xl transition"
          >
            <span>Browse Directory &amp; Book</span>
            <ArrowRight className="w-4 h-4 text-stone-500" />
          </button>
        </div>
      </section>

      {/* Differentiator Highlight: Concierge Booking */}
      <section id="concierge" className="py-12 max-w-5xl mx-auto px-4">
        <div className="bg-gradient-to-br from-amber-50/80 via-white to-stone-50 border border-amber-200/80 rounded-3xl p-8 sm:p-12 shadow-sm">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>The Appointmo Advantage</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mb-3">
              "Not sure what to book? Tell us what you need, and we'll help you find the right service and time."
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed mb-6">
              Instead of forcing customers to interpret a complex service catalogue, Appointmo's Concierge interprets preferences, specialized needs, and budget in natural language, matching them directly to genuine calendar openings.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/demo/concierge')}
                className="bg-stone-900 text-white text-xs font-semibold px-5 py-3 rounded-xl hover:bg-stone-800 transition shadow flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Help Me Find the Right Appointment</span>
              </button>
              <button
                onClick={() => navigate('/demo/book')}
                className="bg-white border border-stone-300 text-stone-700 text-xs font-semibold px-4 py-3 rounded-xl hover:bg-stone-50 transition"
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
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">Two Seamless Demo Experiences</h2>
          <p className="text-xs text-stone-500 mt-2">Connected in real-time through an isolated synthetic PostgreSQL database.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admin Demo Card */}
          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm space-y-4 hover:border-stone-400 transition">
            <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-900 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Admin Operations Demo</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Experience the complete business operations dashboard: real-time revenue, incoming appointment feed, status approvals, reschedule coordination, and instant synchronization.
            </p>
            <ul className="text-xs text-stone-600 space-y-2 pt-2">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Live dashboard metrics from 125 persisted records</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>One-click status management (Complete, Cancel, Confirm)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Dedicated safe reset for synthetic demo data</span>
              </li>
            </ul>
            <div className="pt-4">
              <button
                onClick={() => navigate('/demo/admin')}
                className="w-full py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition"
              >
                Launch Admin Demo &rarr;
              </button>
            </div>
          </div>

          {/* Customer Demo Card */}
          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm space-y-4 hover:border-stone-400 transition">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Customer Booking &amp; Self-Management</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Book appointments directly with genuine availability, then reschedule or cancel anytime through the private self-service portal.
            </p>
            <ul className="text-xs text-stone-600 space-y-2 pt-2">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Quick Booking with instant service selection</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Natural-language Concierge discovery</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Full self-service management (reschedule &amp; cancel anytime)</span>
              </li>
            </ul>
            <div className="pt-4">
              <button
                onClick={() => navigate('/demo/book')}
                className="w-full py-2.5 rounded-xl border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-50 transition"
              >
                Launch Customer Demo &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-10 bg-white text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <AppointmoLogo size="sm" showText={false} />
            <span className="font-semibold text-stone-900">Appointmo</span>
            <span>— Intelligent Scheduling Platform. Powered by Concierge Discovery.</span>
          </div>
          <div className="flex space-x-6 text-[11px]">
            <span>Fictional Demonstration Studio: Lumière Beauty Studio</span>
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
