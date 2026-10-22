import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2, Lightbulb, Compass, Check, Store, MapPin } from 'lucide-react';

interface IdeaSuggestion {
  name: string;
  tagline: string;
  category: string;
  description: string;
  recommendedLocation: string;
  locationReason: string;
  services: Array<{ name: string; price: number; duration: string }>;
}

const CURATED_IDEAS: IdeaSuggestion[] = [
  {
    name: 'Aura Glow Aesthetic Lounge',
    tagline: 'Medical-Grade Hydration & Holistic Facial Wellness',
    category: 'Beauty & Wellness',
    recommendedLocation: 'Taguig / BGC',
    locationReason: 'High foot-traffic pedestrian zones, affluent residential condos, and wellness-focused young professionals.',
    description: 'Boutique facial sanctuary specializing in gentle extractions, lymphatic contouring, and organic peel revitalizations.',
    services: [
      { name: 'Signature Hydra-Luxe Facial', price: 1450, duration: '60 mins' },
      { name: 'Micro-Exfoliating Sensitive Peel', price: 1100, duration: '45 mins' },
      { name: 'Lymphatic Drainage Sculpt', price: 950, duration: '30 mins' },
    ],
  },
  {
    name: 'Zenith Dental Wellness',
    tagline: 'Modern, Anxiety-Free Dental Aesthetics & Hygiene',
    category: 'Dental Services',
    recommendedLocation: 'Makati',
    locationReason: 'Dense corporate headquarters corridor with strong demand for lunch-break cleanings and executive consultations.',
    description: 'Warm, spa-like dental clinic providing pain-free sonic cleanings, cosmetic alignment consultations, and laser whitening.',
    services: [
      { name: 'Painless Air-Flow Cleaning', price: 1800, duration: '45 mins' },
      { name: 'In-Office Enamel Whitening', price: 3200, duration: '60 mins' },
      { name: 'Comprehensive Dental Assessment', price: 800, duration: '30 mins' },
    ],
  },
  {
    name: 'Paws & Purrs Pet Wellness Studio',
    tagline: 'Fear-Free Grooming & Integrative Veterinary Care',
    category: 'Veterinary Services',
    recommendedLocation: 'San Juan / Greenhills',
    locationReason: 'Established pet-friendly residential neighborhoods and gated subdivisions with high pet ownership.',
    description: 'Compassionate companion care studio with acoustic calming therapy, organic coat spa treatments, and routine health checks.',
    services: [
      { name: 'Aroma-Therapy Coat Spa Bath', price: 850, duration: '45 mins' },
      { name: 'Full De-Shedding & Styling', price: 1300, duration: '60 mins' },
      { name: 'Senior Pet Mobility Checkup', price: 750, duration: '30 mins' },
    ],
  },
  {
    name: 'Apex Motion Physical Therapy',
    tagline: 'Precision Posture Correction & Sports Recovery',
    category: 'Health & Fitness',
    recommendedLocation: 'Pasig / Ortigas',
    locationReason: 'Hub for fitness facilities, hybrid tech workers, and athletic clubs seeking injury rehab and recovery.',
    description: 'Specialized clinic for runners, athletes, and desk-bound professionals recovering from chronic pain or joint strain.',
    services: [
      { name: 'Biomechanical Posture Assessment', price: 1200, duration: '45 mins' },
      { name: 'Deep Fascial Release & Cupping', price: 1500, duration: '50 mins' },
      { name: 'Athletic Recovery Percussion Session', price: 900, duration: '30 mins' },
    ],
  },
  {
    name: 'Precision Detail Works',
    tagline: 'Concourse-Grade Ceramic Coating & Interior Sanitization',
    category: 'Automotive & Detailing',
    recommendedLocation: 'Quezon City',
    locationReason: 'Expansive automotive corridor with accessible multi-vehicle bays, high vehicle density, and car enthusiast community.',
    description: 'High-end appointment-only detailing garage utilizing paint correction meters, infrared curing, and ozone sanitization.',
    services: [
      { name: 'Ozone Interior Anti-Bacterial Spa', price: 1400, duration: '60 mins' },
      { name: 'Stage 1 Mirror Polish Treatment', price: 2800, duration: '90 mins' },
      { name: 'Multi-Year Ceramic Shield Application', price: 6500, duration: '180 mins' },
    ],
  },
  {
    name: 'Vanguard Legal & Advisory Lab',
    tagline: 'Strategic Startup Structuring & Contract Audits',
    category: 'Professional Consultations',
    recommendedLocation: 'Alabang / Muntinlupa',
    locationReason: 'Growing South commercial district with thriving regional business parks and startup founders.',
    description: 'Accessible corporate counsel and IP advisory for indie founders, creative agencies, and scaling eCommerce ventures.',
    services: [
      { name: 'Founder Agreement Review & Structuring', price: 2500, duration: '45 mins' },
      { name: 'Intellectual Property Trademark Filing', price: 4000, duration: '60 mins' },
      { name: 'Contract Risk Evaluation Session', price: 1800, duration: '30 mins' },
    ],
  },
];

interface BusinessIdeaGeneratorProps {
  onSelectIdea: (idea: {
    name: string;
    tagline?: string;
    category: string;
    description: string;
    city?: string;
    services?: Array<{ name: string; price: number; duration: string }>;
  }) => void;
}

export const BusinessIdeaGenerator: React.FC<BusinessIdeaGeneratorProps> = ({ onSelectIdea }) => {
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<IdeaSuggestion[]>(CURATED_IDEAS.slice(0, 3));
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const handleGenerate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      const q = userInput.toLowerCase().trim();
      let matches = CURATED_IDEAS;

      if (q) {
        matches = CURATED_IDEAS.filter(
          (idea) =>
            idea.name.toLowerCase().includes(q) ||
            idea.category.toLowerCase().includes(q) ||
            idea.description.toLowerCase().includes(q) ||
            idea.tagline.toLowerCase().includes(q)
        );
        if (matches.length === 0) {
          // Dynamic synthesized idea based on user keyword
          const capitalInput = userInput.charAt(0).toUpperCase() + userInput.slice(1);
          matches = [
            {
              name: `${capitalInput} Studio & Lounge`,
              tagline: `Premium on-demand ${userInput} services designed for busy lifestyles`,
              category: 'Beauty & Wellness',
              recommendedLocation: 'Taguig / BGC',
              locationReason: 'High pedestrian concentration, lifestyle hubs, and prime appointment market demand.',
              description: `A modern appointment-based concept offering curated ${userInput} treatments with online scheduling and private sessions.`,
              services: [
                { name: `Signature ${capitalInput} Experience`, price: 1500, duration: '60 mins' },
                { name: `Express ${capitalInput} Session`, price: 950, duration: '30 mins' },
              ],
            },
            ...CURATED_IDEAS.slice(0, 2),
          ];
        }
      } else {
        // Shuffle to give new inspirations
        matches = [...CURATED_IDEAS].sort(() => 0.5 - Math.random()).slice(0, 3);
      }

      setGeneratedIdeas(matches.slice(0, 3));
      setIsGenerating(false);
    }, 450);
  };

  return (
    <div className="bg-gradient-to-br from-amber-100/60 via-stone-50 to-stone-100 dark:from-stone-900/90 dark:via-stone-900 dark:to-stone-950 border border-amber-200/90 dark:border-stone-800 rounded-3xl p-6 sm:p-10 shadow-sm text-left">
      <div className="max-w-2xl mb-6">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-xs font-semibold mb-3 border border-amber-300/40 dark:border-amber-800">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Real-Time Store Idea Concierge</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          Not sure what kind of store to start?
        </h3>
        <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 font-medium leading-relaxed">
          Type your passion, niche, or vibe (e.g. <em>"barbershop"</em>, <em>"dog spa"</em>, <em>"holistic massage"</em>), and our concierge will instantly generate brand names, positioning taglines, and initial service menus.
        </p>
      </div>

      {/* Idea Prompt Input */}
      <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-2 mb-8">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="e.g. aesthetic skin clinic, nail bar, bike detailing, yoga therapy..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
          />
        </div>
        <button
          type="submit"
          disabled={isGenerating}
          className="px-5 py-3 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-semibold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow flex items-center justify-center space-x-1.5 shrink-0 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Generating Concept...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-stone-950" />
              <span>Inspire Store Concepts</span>
            </>
          )}
        </button>
      </form>

      {/* Generated Suggestions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {generatedIdeas.map((idea, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-stone-900/90 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm hover:border-amber-400 dark:hover:border-amber-400 transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                  {idea.category}
                </span>
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              </div>

              <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {idea.name}
              </h4>
              <p className="text-[11px] text-amber-800 dark:text-amber-300/90 font-medium italic mt-0.5">
                "{idea.tagline}"
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-300 mt-2 font-normal leading-relaxed line-clamp-3">
                {idea.description}
              </p>

              {/* Recommended Location Intelligence */}
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 dark:bg-stone-800/90 border border-amber-500/25 dark:border-stone-700/80 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-[11px] font-bold text-stone-900 dark:text-stone-100">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Best Location: <strong className="text-amber-800 dark:text-amber-300 font-extrabold">{idea.recommendedLocation}</strong></span>
                </div>
                <p className="text-[11px] text-stone-700 dark:text-stone-300 font-medium leading-relaxed">
                  {idea.locationReason}
                </p>
              </div>

              {/* Sample Services Preview */}
              <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-1">
                <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
                  Included Sample Services:
                </span>
                {idea.services.map((s, sIdx) => (
                  <div key={sIdx} className="flex justify-between text-[11px] text-stone-700 dark:text-stone-300">
                    <span className="truncate">{s.name}</span>
                    <span className="font-bold shrink-0 ml-2">₱{s.price}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedName(idea.name);
                onSelectIdea({
                  name: idea.name,
                  tagline: idea.tagline,
                  category: idea.category,
                  description: idea.description,
                  city: idea.recommendedLocation,
                  services: idea.services,
                });
              }}
              className="mt-4 w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-900 hover:text-white dark:bg-stone-800 dark:hover:bg-amber-400 dark:hover:text-stone-950 text-stone-800 dark:text-stone-200 text-xs font-semibold transition flex items-center justify-center space-x-1.5"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Launch This Store &rarr;</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
