import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, AlertCircle, Sparkles, ArrowRight, Building2, MapPin } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { BusinessLogo } from '../components/BusinessLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { DemoTopNav } from '../components/DemoTopNav';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  category: string;
}

interface Slot {
  startTime: string;
  endTime: string;
  staffId: string;
  staffName: string;
}

interface BusinessProfile {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  logoUrl?: string | null;
  branches: Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
  }>;
}

export const QuickBookingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const businessSlug = searchParams.get('slug') || 'lumiere-beauty-studio';
  const initialBranchId = searchParams.get('branchId') || '';

  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(initialBranchId);

  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Default target date: tomorrow or next available weekday
  const tomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [date, setDate] = useState<string>(tomorrowStr());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Guest details form
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [completedBooking, setCompletedBooking] = useState<any | null>(null);

  // Auto-fill customer details from active demo user or previous booking session
  useEffect(() => {
    // 1. Try fetching current demo customer portal profile
    apiFetch<any>('/demo/admin/customer-portal')
      .then(res => {
        if (res?.customer) {
          if (!customerName) setCustomerName(res.customer.name || '');
          if (!customerEmail) setCustomerEmail(res.customer.email || '');
          if (!customerPhone) setCustomerPhone(res.customer.phone || '');
        }
      })
      .catch(() => {
        // 2. Fallback to localStorage if available
        const stored = localStorage.getItem('appointmo_latest_booking');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.customerName && !customerName) setCustomerName(parsed.customerName);
            if (parsed.customerEmail && !customerEmail) setCustomerEmail(parsed.customerEmail);
            if (parsed.customerPhone && !customerPhone) setCustomerPhone(parsed.customerPhone);
          } catch (_) {}
        }
      });
  }, []);

  // 1. Fetch Business Profile
  useEffect(() => {
    apiFetch<{ business: BusinessProfile }>(`/business?slug=${businessSlug}`)
      .then(res => {
        setBusiness(res.business);
        if (!selectedBranchId && res.business.branches.length > 0) {
          setSelectedBranchId(res.business.branches[0].id);
        }
      })
      .catch(console.error);
  }, [businessSlug]);

  // 2. Fetch synthetic services for selected business & branch
  useEffect(() => {
    const url = `/services?slug=${businessSlug}${selectedBranchId ? `&branchId=${selectedBranchId}` : ''}`;
    apiFetch<{ services: Service[] }>(url)
      .then(res => {
        setServices(res.services);
        if (res.services.length > 0) {
          setSelectedService(res.services[0]);
        } else {
          setSelectedService(null);
        }
      })
      .catch(console.error);
  }, [businessSlug, selectedBranchId]);

  // Fetch available slots when service or date changes
  useEffect(() => {
    if (!selectedService || !date) return;
    setLoadingSlots(true);
    setSelectedSlot(null);

    apiFetch<{ slots: Slot[] }>(`/availability?serviceId=${selectedService.id}&date=${date}`)
      .then(res => {
        setSlots(res.slots);
      })
      .catch(err => {
        console.error(err);
        setSlots([]);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [selectedService, date]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot) return;

    setBookingLoading(true);
    setBookingError(null);

    try {
      const res: any = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: selectedService.id,
          staffId: selectedSlot.staffId,
          startTime: selectedSlot.startTime,
          customerName,
          customerEmail,
          customerPhone,
          notes,
        }),
      });

      setCompletedBooking(res.booking);
      toast.success('Appointment booked successfully!', {
        description: `Booking Reference: ${res.booking.bookingReference}`
      });

      // Persist latest booking reference and management token to localStorage for instant 1-click management access
      if (res?.booking?.bookingReference && res?.booking?.managementToken) {
        localStorage.setItem('appointmo_latest_booking', JSON.stringify({
          bookingReference: res.booking.bookingReference,
          managementToken: res.booking.managementToken,
          customerName,
          customerEmail,
          customerPhone,
          serviceName: selectedService.name,
          createdAt: new Date().toISOString()
        }));
      }
    } catch (err: any) {
      const errMsg = err.message || 'This appointment slot was just taken. Please choose another slot.';
      setBookingError(errMsg);
      toast.error('Booking failed', {
        description: errMsg
      });
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-20 transition-colors">
      {/* Top Segmented Navigation Bar */}
      <DemoTopNav currentRole="customer" />

      {/* Main Header */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 py-4 px-6 mb-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="cursor-pointer" onClick={() => navigate('/')}>
              <AppointmoLogo size="sm" showText={false} />
            </div>

            <div className="h-6 w-px bg-stone-200 dark:bg-stone-800 hidden sm:block"></div>

            <div className="flex items-center space-x-3">
              <BusinessLogo
                name={business?.name || 'Appointmo Business'}
                category={business?.category || ''}
                logoUrl={business?.logoUrl}
                size="md"
              />
              <div>
                <h1 className="text-base font-bold text-stone-900 dark:text-stone-100">{business?.name || 'Appointmo Booking'}</h1>
                <p className="text-xs text-stone-500 dark:text-stone-400">{business?.category || 'Intelligent Scheduling'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <button
              onClick={() => navigate(`/demo/concierge?business=${business?.slug || ''}`)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Concierge Finder</span>
            </button>
            <button
              onClick={() => navigate('/browse')}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition text-xs font-semibold"
            >
              Directory
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* Branch Selector if multiple branches exist */}
        {business && business.branches.length > 1 && (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 mb-6 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
              Select Branch Location
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {business.branches.map((br) => (
                <button
                  key={br.id}
                  type="button"
                  onClick={() => setSelectedBranchId(br.id)}
                  className={`p-3 rounded-xl border text-left transition ${
                    selectedBranchId === br.id
                      ? 'border-stone-900 dark:border-amber-400 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-sm font-bold'
                      : 'border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 bg-white dark:bg-stone-800/80 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  <div className="font-bold text-xs">{br.name}</div>
                  <div className={`text-[11px] truncate mt-0.5 ${selectedBranchId === br.id ? 'text-stone-300 dark:text-stone-900 font-semibold' : 'text-stone-600 dark:text-stone-300'}`}>
                    {br.address}, {br.city}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Mode Banner */}
        <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-100">
          <div>
            <span className="font-bold">Not sure which service fits your goals or schedule?</span>
            <p className="text-amber-800 dark:text-amber-200/90 text-[11px] mt-0.5 font-medium">Let our Concierge find the ideal service and time slot for your budget.</p>
          </div>
          <button
            onClick={() => navigate(`/demo/concierge?business=${business?.slug || ''}`)}
            className="shrink-0 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold px-3.5 py-2 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow text-xs flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-stone-950" />
            <span>Try Concierge Booking</span>
          </button>
        </div>

        {/* Confirmation Screen */}
        {completedBooking ? (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 shadow-sm space-y-6 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Booking Request Received!</h2>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold text-xs mt-2 uppercase tracking-wider">
                <span>Status: Pending Confirmation</span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 mt-2 font-medium">
                Your appointment request has been scheduled and sent to the studio for review.
              </p>
            </div>

            <div className="bg-stone-50 dark:bg-stone-800/60 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 text-xs text-left max-w-md mx-auto space-y-3 font-mono">
              <div className="flex justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                <span className="text-stone-600 dark:text-stone-300 font-sans font-medium">Booking Ref:</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">{completedBooking.bookingReference}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                <span className="text-stone-600 dark:text-stone-300 font-sans font-medium">Service:</span>
                <span className="text-stone-800 dark:text-stone-200 font-medium">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                <span className="text-stone-600 dark:text-stone-300 font-sans font-medium">Staff Specialist:</span>
                <span className="text-stone-800 dark:text-stone-200 font-medium">{selectedSlot?.staffName}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                <span className="text-stone-600 dark:text-stone-300 font-sans font-medium">Schedule:</span>
                <span className="text-stone-800 dark:text-stone-200 font-medium">
                  {new Date(selectedSlot?.startTime || '').toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-300 font-sans font-medium">Price:</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">₱{selectedService?.price}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                onClick={() => navigate(`/manage?ref=${completedBooking.bookingReference}&token=${completedBooking.managementToken}`)}
                className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold px-5 py-2.5 rounded-xl hover:bg-stone-800 dark:hover:bg-stone-200 transition text-xs shadow flex items-center space-x-1.5"
              >
                <span>Manage My Booking</span>
                <span>&rarr;</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Booking Ref: ${completedBooking.bookingReference}\nToken: ${completedBooking.managementToken}`);
                  alert('Booking details copied to clipboard!');
                }}
                className="bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold px-4 py-2.5 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition text-xs"
              >
                Copy Reference &amp; Token
              </button>
              <button
                onClick={() => {
                  setCompletedBooking(null);
                  setSelectedSlot(null);
                }}
                className="text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 text-xs underline"
              >
                Book another appointment
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBookingSubmit} className="space-y-6">
            {/* Step 1: Select Service */}
            <div className="bg-stone-50/80 dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 mb-4">
                1. Select a Service
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedService(s)}
                    className={`p-4 rounded-2xl border text-left transition ${
                      selectedService?.id === s.id
                        ? 'border-stone-900 dark:border-amber-400 ring-2 ring-stone-900 dark:ring-amber-400 bg-stone-100 dark:bg-stone-800 shadow-sm'
                        : 'border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-700 bg-white dark:bg-stone-800/90 text-stone-900 dark:text-stone-100'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm text-stone-900 dark:text-stone-100">{s.name}</span>
                      <span className="font-bold text-sm text-stone-900 dark:text-amber-400">₱{s.price}</span>
                    </div>
                    <p className="text-xs text-stone-700 dark:text-stone-300 line-clamp-2 leading-relaxed">{s.description}</p>
                    <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 mt-2">{s.durationMinutes} mins • {s.category}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Date & Available Time Slot */}
            <div className="bg-stone-50/80 dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 mb-4">
                2. Choose Date &amp; Available Time
              </h2>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Select Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 font-medium"
                />
              </div>

              {loadingSlots ? (
                <div className="py-8 text-center text-xs text-stone-500 dark:text-stone-400 font-medium">
                  Calculating real calendar availability...
                </div>
              ) : slots.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700 font-medium">
                  No available openings found for this date. Please try another day or use our{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/demo/concierge')}
                    className="text-stone-900 dark:text-amber-400 font-bold underline"
                  >
                    Concierge
                  </button>
                  .
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-xl border text-center transition ${
                        selectedSlot?.startTime === slot.startTime && selectedSlot?.staffId === slot.staffId
                          ? 'border-stone-900 dark:border-amber-400 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold shadow-sm'
                          : 'border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 bg-white dark:bg-stone-800/80 text-stone-800 dark:text-stone-200 font-medium'
                      }`}
                    >
                      <div className="font-bold text-xs">
                        {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className={`text-[10px] mt-0.5 truncate ${selectedSlot?.startTime === slot.startTime ? 'text-stone-300 dark:text-stone-900 font-semibold' : 'text-stone-500 dark:text-stone-400'}`}>
                        {slot.staffName}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3: Customer Information */}
            <div className="bg-stone-50/80 dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 mb-4">
                3. Customer Contact Info
              </h2>

              {bookingError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs mb-4 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Beatriz Alonzo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="beatriz@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="+63 900 000 0000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Notes / Preferences (Optional)</label>
                  <input
                    type="text"
                    placeholder="Any preferences..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={bookingLoading || !selectedSlot || !customerName || !customerEmail || !customerPhone}
                  className="w-full bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold py-3.5 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition text-xs shadow-md disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>{bookingLoading ? 'Reserving...' : 'Confirm Appointment Booking'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
