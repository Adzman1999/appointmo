import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/api';

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

export const QuickBookingPage: React.FC = () => {
  const navigate = useNavigate();
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

  // Fetch synthetic services on load
  useEffect(() => {
    apiFetch<{ services: Service[] }>('/services')
      .then(res => {
        setServices(res.services);
        if (res.services.length > 0) {
          setSelectedService(res.services[0]);
        }
      })
      .catch(console.error);
  }, []);

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
    } catch (err: any) {
      setBookingError(err.message || 'This appointment slot was just taken. Please choose another slot.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-20">
      {/* Top Banner indicating Fictional Demo Environment */}
      <div className="bg-stone-900 text-stone-300 py-2 px-4 text-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-semibold text-white">Public Customer Demo:</span>
            <span>Lumière Beauty Studio (Synthetic Demonstration). No real card or payment required.</span>
          </div>
          <button
            onClick={() => navigate('/demo/admin')}
            className="text-white hover:text-amber-300 font-semibold underline text-xs"
          >
            Switch to Admin Demo &rarr;
          </button>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white border-b border-stone-200 py-4 px-6 mb-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-base shadow">
              L
            </div>
            <div>
              <h1 className="text-base font-bold text-stone-900">Lumière Beauty Studio</h1>
              <p className="text-xs text-stone-500">Intelligent Online Booking</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/demo/concierge')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Help Me Find the Right Appointment</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 transition text-xs font-semibold"
            >
              Home
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* Navigation Mode Banner */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-950">
          <div>
            <span className="font-bold">Not sure which service fits your skin or schedule?</span>
            <p className="text-amber-800 text-[11px] mt-0.5">Let our Concierge find the ideal service and time slot for your budget.</p>
          </div>
          <button
            onClick={() => navigate('/demo/concierge')}
            className="shrink-0 bg-stone-900 text-white font-semibold px-3.5 py-2 rounded-xl hover:bg-stone-800 transition shadow text-xs flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Try Concierge Booking</span>
          </button>
        </div>

        {/* Confirmation Screen */}
        {completedBooking ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm space-y-6 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-stone-900">Appointment Confirmed!</h2>
              <p className="text-xs text-stone-500 mt-1">
                Your appointment has been booked and synchronized with our business calendar.
              </p>
            </div>

            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200 text-xs text-left max-w-md mx-auto space-y-3 font-mono">
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500 font-sans">Booking Ref:</span>
                <span className="font-bold text-stone-900">{completedBooking.bookingReference}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500 font-sans">Service:</span>
                <span className="text-stone-800">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500 font-sans">Staff Specialist:</span>
                <span className="text-stone-800">{selectedSlot?.staffName}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500 font-sans">Schedule:</span>
                <span className="text-stone-800">
                  {new Date(selectedSlot?.startTime || '').toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Price:</span>
                <span className="font-bold text-stone-900">₱{selectedService?.price}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                onClick={() => navigate(`/manage?ref=${completedBooking.bookingReference}&token=${completedBooking.managementToken}`)}
                className="bg-stone-900 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-stone-800 transition text-xs shadow"
              >
                Manage My Booking &rarr;
              </button>
              <button
                onClick={() => navigate('/demo/admin')}
                className="bg-stone-100 border border-stone-200 text-stone-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-stone-200 transition text-xs"
              >
                View on Admin Demo Dashboard
              </button>
              <button
                onClick={() => {
                  setCompletedBooking(null);
                  setSelectedSlot(null);
                }}
                className="text-stone-500 hover:text-stone-900 text-xs underline"
              >
                Book another appointment
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBookingSubmit} className="space-y-6">
            {/* Step 1: Select Service */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-600 mb-4">
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
                        ? 'border-stone-900 ring-2 ring-stone-900 bg-stone-50 shadow-sm'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm text-stone-900">{s.name}</span>
                      <span className="font-bold text-sm text-stone-900">₱{s.price}</span>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{s.description}</p>
                    <div className="text-[11px] font-semibold text-stone-400 mt-2">{s.durationMinutes} mins • {s.category}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Date & Available Time Slot */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-600 mb-4">
                2. Choose Date &amp; Available Time
              </h2>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-stone-700 mb-1">Select Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              {loadingSlots ? (
                <div className="py-8 text-center text-xs text-stone-400">
                  Calculating real calendar availability...
                </div>
              ) : slots.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl border border-stone-200">
                  No available openings found for this date. Please try another day or use our{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/demo/concierge')}
                    className="text-stone-900 font-bold underline"
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
                          ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                          : 'border-stone-200 hover:border-stone-400 bg-white text-stone-800'
                      }`}
                    >
                      <div className="font-bold text-xs">
                        {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className={`text-[10px] mt-0.5 truncate ${selectedSlot?.startTime === slot.startTime ? 'text-stone-300' : 'text-stone-500'}`}>
                        {slot.staffName}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3: Customer Information */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-600 mb-4">
                3. Customer Contact Info
              </h2>

              {bookingError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-4 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Beatriz Alonzo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="beatriz@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="+63 900 000 0000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Notes / Preferences (Optional)</label>
                  <input
                    type="text"
                    placeholder="Any preferences..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-stone-900"
                  />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={bookingLoading || !selectedSlot || !customerName || !customerEmail || !customerPhone}
                  className="w-full bg-stone-900 text-white font-semibold py-3.5 rounded-xl hover:bg-stone-800 transition text-xs shadow disabled:opacity-50 flex items-center justify-center space-x-2"
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
