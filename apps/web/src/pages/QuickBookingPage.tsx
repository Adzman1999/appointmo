import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  category: string;
}

interface Staff {
  id: string;
  name: string;
  bio: string;
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

  // Fetch services on load
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
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedService, date]);

  const handleBook = async (e: React.FormEvent) => {
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
      setBookingError(err.message || 'Failed to book appointment. The time slot may have just been taken.');
      // Refresh available slots
      if (selectedService && date) {
        apiFetch<{ slots: Slot[] }>(`/availability?serviceId=${selectedService.id}&date=${date}`)
          .then(res => setSlots(res.slots));
      }
    } finally {
      setBookingLoading(false);
    }
  };

  if (completedBooking) {
    return (
      <div className="min-h-screen bg-stone-50 py-12 px-4 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-stone-200 p-8 shadow-sm text-center">
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-1">Appointment Confirmed!</h2>
          <p className="text-xs text-stone-500 mb-6">Your appointment has been registered in the salon calendar.</p>

          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-left text-xs space-y-3 mb-6">
            <div className="flex justify-between border-b border-stone-200 pb-2">
              <span className="text-stone-500">Booking Reference:</span>
              <span className="font-mono font-bold text-stone-900">{completedBooking.bookingReference}</span>
            </div>
            <div className="flex justify-between border-b border-stone-200 pb-2">
              <span className="text-stone-500">Service:</span>
              <span className="font-semibold text-stone-900">{completedBooking.serviceName}</span>
            </div>
            <div className="flex justify-between border-b border-stone-200 pb-2">
              <span className="text-stone-500">Scheduled Time:</span>
              <span className="font-medium text-stone-900">
                {new Date(completedBooking.appointment.start_time).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Price Snapshot:</span>
              <span className="font-bold text-stone-900">₱{completedBooking.price}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-[11px] text-amber-900 mb-6">
            <span className="font-bold block mb-1">Guest Management Token:</span>
            <span className="font-mono break-all bg-white/70 p-1 rounded border border-amber-300 block">
              {completedBooking.managementToken}
            </span>
            <span className="block mt-1 text-amber-700">Save this token to look up or cancel your appointment at any time.</span>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => {
                setCompletedBooking(null);
                setSelectedSlot(null);
              }}
              className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50 transition"
            >
              Book Another
            </button>
            <button
              onClick={() => navigate(`/manage?ref=${completedBooking.bookingReference}&token=${completedBooking.managementToken}`)}
              className="flex-1 py-2.5 rounded-xl bg-stone-900 text-white font-semibold text-xs hover:bg-stone-800 transition"
            >
              Manage Booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Top Bar */}
      <div className="bg-white border-b border-stone-200 py-4 px-6 mb-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-stone-900">Lumière Beauty Studio</h1>
            <p className="text-xs text-stone-500">142 Tomas Morato Ave, Quezon City</p>
          </div>
          <button
            onClick={() => navigate('/concierge')}
            className="inline-flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Try Concierge Booking</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 grid lg:grid-cols-3 gap-8">
        {/* Step 1: Services */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-xs flex items-center justify-center font-mono">1</span>
            <span>Select Service</span>
          </h2>

          <div className="space-y-2">
            {services.map(s => (
              <div
                key={s.id}
                onClick={() => setSelectedService(s)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  selectedService?.id === s.id
                    ? 'border-stone-900 bg-white ring-2 ring-stone-900/10 shadow-sm'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-sm text-stone-900">{s.name}</h3>
                  <span className="font-bold text-sm text-stone-900">₱{s.price}</span>
                </div>
                <p className="text-xs text-stone-500 line-clamp-2 mb-2">{s.description}</p>
                <div className="flex items-center space-x-3 text-[11px] text-stone-400">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{s.durationMinutes} mins</span>
                  </span>
                  <span>•</span>
                  <span>{s.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Date & Available Slots */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-xs flex items-center justify-center font-mono">2</span>
            <span>Choose Date & Time</span>
          </h2>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <label className="block text-xs font-semibold text-stone-700 mb-2 flex items-center space-x-1.5">
              <CalendarIcon className="w-4 h-4 text-stone-500" />
              <span>Select Date</span>
            </label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
            />
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm min-h-[300px]">
            <h3 className="text-xs font-semibold text-stone-700 mb-3 flex items-center justify-between">
              <span>Available Times</span>
              <span className="text-[10px] text-stone-400 font-normal">Real schedule calculation</span>
            </h3>

            {loadingSlots ? (
              <div className="py-12 text-center text-xs text-stone-400">Checking salon availability...</div>
            ) : slots.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
                No slots available on this date. Please choose another date.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                {slots.map((slot, idx) => {
                  const timeLabel = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const isSelected = selectedSlot?.startTime === slot.startTime && selectedSlot?.staffId === slot.staffId;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        isSelected
                          ? 'border-stone-900 bg-stone-900 text-white shadow'
                          : 'border-stone-200 hover:border-stone-400 text-stone-800 bg-stone-50/50'
                      }`}
                    >
                      <div className="font-semibold text-xs">{timeLabel}</div>
                      <div className={`text-[10px] truncate ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>
                        {slot.staffName}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Guest Checkout Form */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-xs flex items-center justify-center font-mono">3</span>
            <span>Guest Confirmation</span>
          </h2>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            {bookingError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleBook} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Clara"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+63 917 123 4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Notes / Requests (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Skin sensitivities, preferences..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              {selectedService && selectedSlot && (
                <div className="pt-2 border-t border-stone-100 text-xs space-y-1 text-stone-600">
                  <div className="flex justify-between">
                    <span>Therapist:</span>
                    <span className="font-semibold text-stone-900">{selectedSlot.staffName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Due:</span>
                    <span className="font-bold text-stone-900">₱{selectedService.price}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={bookingLoading || !selectedSlot}
                className="w-full mt-4 bg-stone-900 text-white font-semibold py-3 rounded-xl hover:bg-stone-800 transition text-xs shadow disabled:opacity-40"
              >
                {bookingLoading ? 'Securing Booking...' : selectedSlot ? 'Confirm Appointment' : 'Select a Time Slot First'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
