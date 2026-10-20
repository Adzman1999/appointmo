import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Sparkles, Shield, Clock, CheckCircle2, ChevronRight, UserCheck, ArrowRight } from 'lucide-react';
import { AccessGateModal } from '../components/AccessGateModal';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [initialModalTab, setInitialModalTab] = useState<'request' | 'verify'>('request');

  const openRequestAccess = () => {
    setInitialModalTab('request');
    setIsAccessModalOpen(true);
  };

  const openEnterCode = () => {
    setInitialModalTab('verify');
    setIsAccessModalOpen(true);
  };

  const handleAccessGranted = () => {
    setIsAccessModalOpen(false);
    navigate('/demo/book');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 selection:bg-stone-200">
      {/* Access Gate Modal (Friendly & Natural) */}
      <AccessGateModal
        isOpen={isAccessModalOpen}
        initialTab={initialModalTab}
        onClose={() => setIsAccessModalOpen(false)}
        onSuccess={handleAccessGranted}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              A
            </div>
            <div>
              <span className="font-semibold text-xl tracking-tight text-stone-900">Appointmo</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                Salon &amp; Studio Suite
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-stone-600">
            <a href="#how-it-works" className="hover:text-stone-900 transition-colors">How It Works</a>
            <a href="#features" className="hover:text-stone-900 transition-colors">Features</a>
            <a href="#preview" className="hover:text-stone-900 transition-colors">Product Preview</a>
            <button
              onClick={openEnterCode}
              className="hover:text-stone-900 transition-colors text-amber-800 font-semibold text-xs"
            >
              Have an Access Code?
            </button>
          </nav>

          <div className="flex items-center space-x-3">
            <button
              onClick={openRequestAccess}
              className="text-xs sm:text-sm font-semibold bg-stone-900 text-white px-4 py-2 rounded-lg hover:bg-stone-800 transition shadow-sm"
            >
              Request Access
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Next-Generation Studio Scheduling</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-stone-900 mb-6 leading-tight">
          Appointments, <br className="hidden sm:block" />
          <span className="text-stone-700">made simpler.</span>
        </h1>
        <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Find the right service, discover genuinely available times, and book with confidence. Appointmo combines frictionless guest booking with an intelligent natural-language concierge.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={openRequestAccess}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-stone-900 text-white font-medium px-6 py-3.5 rounded-xl hover:bg-stone-800 transition shadow-md"
          >
            <span>Request Access</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={openEnterCode}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white text-stone-700 border border-stone-300 font-medium px-6 py-3.5 rounded-xl hover:bg-stone-50 transition"
          >
            <span>Have an Access Code?</span>
          </button>
        </div>
      </section>

      {/* Product Preview Cards */}
      <section id="preview" className="py-16 max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Intelligent Booking Experience
          </h2>
          <p className="text-stone-600 text-sm mt-2">
            Showcasing Lumière Beauty Studio with genuine real-time database scheduling and live staff rosters.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Quick Booking Preview */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 rounded-xl bg-stone-100 text-stone-800">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-stone-900">Quick Booking Engine</h3>
                <p className="text-xs text-stone-500">Fast 3-step checkout without account requirements</p>
              </div>
            </div>
            <p className="text-sm text-stone-600 mb-6">
              Customers pick a curated aesthetic service, choose a preferred date, and inspect genuine unreserved slots validated against staff working hours, breaks, and active bookings.
            </p>
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 text-xs text-stone-600 space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-stone-200">
                <span className="font-medium text-stone-900">Basic Facial (45 min)</span>
                <span className="font-semibold text-stone-900">₱800</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-200">
                <span className="font-medium text-stone-900">Deep Cleansing Facial (75 min)</span>
                <span className="font-semibold text-stone-900">₱1,500</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-medium text-stone-900">Relaxation Massage (60 min)</span>
                <span className="font-semibold text-stone-900">₱1,000</span>
              </div>
            </div>
          </div>

          {/* Concierge Booking Preview */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-900">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-stone-900">Concierge Booking</h3>
                <p className="text-xs text-stone-500">Natural-language preference & availability scoring</p>
              </div>
            </div>
            <p className="text-sm text-stone-600 mb-6">
              Express requests like <span className="font-medium text-stone-800 italic">“I want a facial tomorrow afternoon under ₱1,500”</span> and receive scored, explainable slot recommendations backed by PostgreSQL transactions.
            </p>
            <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200/80 text-xs text-amber-900 space-y-2">
              <div className="font-semibold text-amber-950 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Explainable Criteria Validation</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px]">
                <li>Matches category: Facial Care</li>
                <li>Within budget ceiling (₱1,200 &lt;= ₱1,500)</li>
                <li>Available afternoon slot with certified specialist Maria Santos</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-16 bg-stone-100 border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              How Appointmo Works
            </h2>
            <p className="text-stone-600 text-sm mt-2">
              Engineered for seamless customer discovery and rigorous schedule integrity.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <span className="w-8 h-8 rounded-full bg-stone-900 text-white font-bold text-sm flex items-center justify-center mb-4">
                1
              </span>
              <h4 className="font-semibold text-base text-stone-900 mb-1">Select or Inquire</h4>
              <p className="text-xs text-stone-600">
                Browse our curated menu or type your specific wellness requirements to our concierge.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <span className="w-8 h-8 rounded-full bg-stone-900 text-white font-bold text-sm flex items-center justify-center mb-4">
                2
              </span>
              <h4 className="font-semibold text-base text-stone-900 mb-1">Real Availability</h4>
              <p className="text-xs text-stone-600">
                Slot options computed live against therapist working hours, breaks, and existing bookings.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <span className="w-8 h-8 rounded-full bg-stone-900 text-white font-bold text-sm flex items-center justify-center mb-4">
                3
              </span>
              <h4 className="font-semibold text-base text-stone-900 mb-1">Confirm with Ease</h4>
              <p className="text-xs text-stone-600">
                No compulsory password or sign-up. Receive instant reference and a secret management token.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <span className="w-8 h-8 rounded-full bg-stone-900 text-white font-bold text-sm flex items-center justify-center mb-4">
                4
              </span>
              <h4 className="font-semibold text-base text-stone-900 mb-1">Manage Securely</h4>
              <p className="text-xs text-stone-600">
                Lookup bookings or cancel safely with zero risk of enumerating other customer records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Enterprise Grade Architecture
          </h2>
          <p className="text-stone-600 text-sm mt-2">
            Every feature is backed by clean relational database design and security best practices.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl border border-stone-200 bg-white shadow-sm">
            <Shield className="w-6 h-6 text-stone-800 mb-3" />
            <h4 className="font-semibold text-stone-900 mb-2">Concurrency &amp; Conflict Locks</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Atomic transactional queries prevent double-booking across concurrent customer checkouts.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-stone-200 bg-white shadow-sm">
            <UserCheck className="w-6 h-6 text-stone-800 mb-3" />
            <h4 className="font-semibold text-stone-900 mb-2">Contact-First Demo Access</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Demo access requires product owner approval. Single-use hashed invitation tokens safeguard the environment.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-stone-200 bg-white shadow-sm">
            <Calendar className="w-6 h-6 text-stone-800 mb-3" />
            <h4 className="font-semibold text-stone-900 mb-2">Live Staff Rostering</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Staff qualification matrices, shift schedules, meal breaks, and custom time-off periods.
            </p>
          </div>
        </div>
      </section>

      {/* Customer Experience: Let's Get You Started Callout Section */}
      <section id="request-demo" className="py-20 bg-stone-900 text-white">
        <div className="max-w-xl mx-auto px-4 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Experience Appointmo</span>
          <h2 className="text-3xl font-bold mt-2">Let's Get You Started</h2>
          <p className="text-stone-400 text-sm mt-3 leading-relaxed">
            Our interactive experience is available by invitation. Send us a quick request, and we'll email you when your access is ready.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={openRequestAccess}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white text-stone-900 font-semibold text-xs hover:bg-stone-100 transition shadow"
            >
              Request Access
            </button>
            <button
              onClick={openEnterCode}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-stone-700 text-stone-300 font-semibold text-xs hover:bg-stone-800 transition"
            >
              Have an Access Code?
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-10 bg-white text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-stone-900">Appointmo</span>
            <span>— The smarter way to book. Powered by intelligent scheduling.</span>
          </div>
          <div className="flex space-x-6">
            <span>Featured Business: Lumière Beauty Studio (Quezon City, PH)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
