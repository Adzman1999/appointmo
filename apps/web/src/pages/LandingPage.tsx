import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CheckCircle2, Building2, Plus, Phone, Mail
} from 'lucide-react';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { BusinessCreationModal } from '../components/BusinessCreationModal';
import { BusinessIdeaGenerator } from '../components/BusinessIdeaGenerator';
import { ThemeToggle } from '../components/ThemeToggle';
import { DemoTopNav } from '../components/DemoTopNav';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<{ name?: string; category?: string; description?: string } | undefined>(undefined);

  const handleOpenCreateWithIdea = (idea: { name: string; category: string; description: string }) => {
    setModalInitialData(idea);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 selection:bg-stone-200 dark:selection:bg-stone-800 transition-colors">
      {/* Top Demo Navigation Bar with Direct Role Switcher */}
      <DemoTopNav currentRole="customer" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <AppointmoLogo size="md" subtitle="Intelligent Scheduling" />
          </div>

          {/* Action Controls: Theme Toggle, Create Business, Sign In, Sign Up */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <ThemeToggle />

            <button
              onClick={() => {
                setModalInitialData(undefined);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-semibold text-xs hover:bg-amber-200 dark:hover:bg-amber-900/80 transition shadow-sm"
              title="Launch a new business or store"
            >
              <Plus className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
              <span>Create Business</span>
            </button>

            <button
              onClick={() => navigate('/admin/login')}
              className="px-3 sm:px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold text-xs hover:bg-stone-100 dark:hover:bg-stone-700 transition"
            >
              Sign In
            </button>

            <button
              onClick={() => {
                setModalInitialData(undefined);
                setIsCreateModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-semibold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 max-w-5xl mx-auto px-4 text-center">
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

        {/* Primary Call to Action Button */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => {
              setModalInitialData(undefined);
              setIsCreateModalOpen(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 px-8 py-3.5 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow font-bold text-sm"
          >
            <Plus className="w-4 h-4 text-amber-300 dark:text-stone-950" />
            <span>Create Your Business</span>
          </button>
        </div>
      </section>

      {/* Real-Time Business Idea Suggestion Concierge Generator */}
      <section className="py-6 max-w-5xl mx-auto px-4">
        <BusinessIdeaGenerator onSelectIdea={handleOpenCreateWithIdea} />
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

      {/* Footer with Personal Direct Contact Details */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-10 bg-white dark:bg-stone-900 text-xs text-stone-600 dark:text-stone-300">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <AppointmoLogo size="sm" showText={false} />
            <span className="font-semibold text-stone-900 dark:text-stone-100">Appointmo</span>
            <span className="text-stone-600 dark:text-stone-300">— Intelligent Scheduling Platform. Powered by Concierge Discovery.</span>
          </div>

          {/* Contact Details */}
          <div className="flex flex-wrap items-center gap-4 text-stone-700 dark:text-stone-300 text-xs font-medium">
            <a
              href="tel:09052422821"
              className="flex items-center space-x-1.5 hover:text-stone-900 dark:hover:text-white transition"
            >
              <Phone className="w-3.5 h-3.5 text-amber-500" />
              <span>09052422821</span>
            </a>
            <span className="text-stone-300 dark:text-stone-700 hidden sm:inline">•</span>
            <a
              href="mailto:abdulsamadadzmani@gmail.com"
              className="flex items-center space-x-1.5 hover:text-stone-900 dark:hover:text-white transition"
            >
              <Mail className="w-3.5 h-3.5 text-amber-500" />
              <span>abdulsamadadzmani@gmail.com</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Business Setup Wizard Modal */}
      <BusinessCreationModal
        isOpen={isCreateModalOpen}
        initialData={modalInitialData}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newBiz) => {
          setIsCreateModalOpen(false);
          navigate(`/demo/admin?slug=${encodeURIComponent(newBiz.slug)}`);
        }}
      />
    </div>
  );
};
