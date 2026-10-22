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
  const [modalInitialData, setModalInitialData] = useState<{
    name?: string;
    tagline?: string;
    category?: string;
    description?: string;
    city?: string;
    services?: Array<{ name: string; price: number; duration: string }>;
  } | undefined>(undefined);

  const handleOpenCreateWithIdea = (idea: {
    name: string;
    tagline?: string;
    category: string;
    description: string;
    city?: string;
    services?: Array<{ name: string; price: number; duration: string }>;
  }) => {
    setModalInitialData(idea);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 selection:bg-stone-200 dark:selection:bg-stone-800 transition-colors">
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
              onClick={() => navigate('/admin/login?mode=signup&role=store')}
              className="px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-semibold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 max-w-5xl mx-auto px-4 text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Intelligent Booking &amp; Studio Operations Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-stone-900 dark:text-stone-50 mb-6 leading-tight">
          Intelligent, guided appointment scheduling for any service business.
        </h1>

        <p className="text-base sm:text-lg text-stone-700 dark:text-stone-200 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Designed for studios, clinics, salons, wellness centres, and professional services. Appointmo delivers automated real-time booking, instant calendar sync, and private self-service appointment management.
        </p>

        {/* Primary Call to Action Button */}
        <div className="flex flex-wrap items-center justify-center gap-3">
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

          <button
            onClick={() => navigate('/admin/login')}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 px-6 py-3.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition font-bold text-sm"
          >
            <span>Sign In to Portal</span>
          </button>
        </div>
      </section>

      {/* Real-Time Business Idea Suggestion Concierge Generator */}
      <section className="py-6 max-w-5xl mx-auto px-4 pb-16">
        <BusinessIdeaGenerator onSelectIdea={handleOpenCreateWithIdea} />
      </section>

      {/* Footer with Combined Copyright and Direct Contact Details */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-10 bg-white dark:bg-stone-900 text-xs text-stone-600 dark:text-stone-300">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <AppointmoLogo size="sm" showText={false} />
            <span className="font-semibold text-stone-900 dark:text-stone-100">© 2026 Appointmo. All rights reserved.</span>
          </div>

          {/* Combined Direct Contact Details */}
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
        onSuccess={() => {
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
};
