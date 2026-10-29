import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, AlertCircle, Sparkles, ArrowRight, Building2, MapPin } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { BusinessLogo } from '../components/BusinessLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { StoreOperationalStatusNotice } from '../components/StoreOperationalStatusNotice';
import { toast } from 'sonner';
import { FormalNameFields } from '../components/FormalNameFields';
import { CountryPhoneInput } from '../components/CountryPhoneInput';
import { formatFormalName, parseFormalName, validateFullPhoneNumber, normalizePhoneNumber, getCountryByName } from '../lib/countryConfig';

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
  country?: string;
  timezone?: string;
  operationalStatus?: 'open' | 'temporarily_closed';
  temporaryClosureReason?: string | null;
  expectedReopenAt?: string | null;
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
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerMiddleName, setCustomerMiddleName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [authenticatedCustomer, setAuthenticatedCustomer] = useState<any | null>(null);
  const [bookingForSomeoneElse, setBookingForSomeoneElse] = useState(false);
  const [recipientFirstName, setRecipientFirstName] = useState('');
  const [recipientMiddleName, setRecipientMiddleName] = useState('');
  const [recipientLastName, setRecipientLastName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [completedBooking, setCompletedBooking] = useState<any | null>(null);

  // Step-by-step wizard chunking: 1 = Service, 2 = Branch & Schedule, 3 = Guest Details & Review
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // A signed-in customer owns the booking; recipient details are separate when booking for another person.
  useEffect(() => {
    if (!localStorage.getItem('appointmo_token')) return;

    try {
      const storedUser = localStorage.getItem('appointmo_user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      if (user?.role !== 'customer') return;
      setAuthenticatedCustomer(user);

      if (user.name) {
        const parsedName = parseFormalName(user.name);
        setCustomerFirstName(parsedName.firstName);
        setCustomerMiddleName(parsedName.middleName || '');
        setCustomerLastName(parsedName.lastName);
      }
      if (user.email) setCustomerEmail(user.email);
      if (user.phone) setCustomerPhone(user.phone);
    } catch {
      // Malformed or missing account details leave the form blank for manual entry.
    }
  }, []);

  // 1. Fetch Business Profile
  useEffect(() => {
    const fetchBusiness = () => {
      apiFetch<{ business: BusinessProfile }>(`/business?slug=${businessSlug}`)
        .then(res => {
          setBusiness(res.business);
          if (!selectedBranchId && res.business.branches.length > 0) {
            setSelectedBranchId(res.business.branches[0].id);
          }
        })
        .catch(console.error);
    };
    fetchBusiness();
    const refreshInterval = window.setInterval(fetchBusiness, 30_000);
    window.addEventListener('focus', fetchBusiness);
    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', fetchBusiness);
    };
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

    apiFetch<{ slots: Slot[]; business?: Pick<BusinessProfile, 'operationalStatus' | 'temporaryClosureReason' | 'expectedReopenAt' | 'timezone'> }>(`/availability?serviceId=${selectedService.id}&date=${date}`)
      .then(res => {
        setSlots(res.slots || []);
        if (res.business) {
          setBusiness((current) => current ? { ...current, ...res.business } : current);
        }
      })
      .catch(err => {
        console.error(err);
        setSlots([]);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [selectedService, date, business?.operationalStatus]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (business?.operationalStatus === 'temporarily_closed') {
      setBookingError('This store is temporarily closed and is not accepting new appointments.');
      return;
    }
    if (!selectedService || !selectedSlot) {
      toast.error('Please select both a service and a time slot.');
      return;
    }

    if (!customerFirstName.trim() || !customerLastName.trim()) {
      setBookingError('Please enter your first name and last name.');
      toast.error('Name Required', { description: 'First name and last name are required.' });
      return;
    }

    if (!customerEmail.trim()) {
      setBookingError('Please enter your email address.');
      toast.error('Email Required', { description: 'A valid email address is required.' });
      return;
    }

    const storeCountry = business?.country || 'Philippines';
    const phoneVal = validateFullPhoneNumber(customerPhone, storeCountry, true);
    if (!phoneVal.isValid) {
      setBookingError(phoneVal.error || 'Please provide a valid complete phone number.');
      toast.error('Invalid Phone Number', { description: phoneVal.error });
      return;
    }

    let recipientFullName: string | undefined;
    let normalizedRecipientPhone: string | undefined;
    if (bookingForSomeoneElse) {
      if (!recipientFirstName.trim() || !recipientLastName.trim()) {
        setBookingError('Enter the first and last name of the person receiving the service.');
        toast.error('Recipient Name Required');
        return;
      }
      if (recipientPhone.trim()) {
        const recipientPhoneVal = validateFullPhoneNumber(recipientPhone, storeCountry, true);
        if (!recipientPhoneVal.isValid) {
          setBookingError(recipientPhoneVal.error || 'Enter a valid recipient phone number.');
          toast.error('Invalid Recipient Phone', { description: recipientPhoneVal.error });
          return;
        }
      }
      recipientFullName = formatFormalName({
        firstName: recipientFirstName,
        middleName: recipientMiddleName,
        lastName: recipientLastName,
      });
      normalizedRecipientPhone = recipientPhone.trim()
        ? normalizePhoneNumber(recipientPhone, getCountryByName(storeCountry).code)
        : undefined;
    }

    const formalFullName = formatFormalName({
      firstName: customerFirstName,
      middleName: customerMiddleName,
      lastName: customerLastName,
    });
    const normalizedCustomerPhone = normalizePhoneNumber(customerPhone, getCountryByName(storeCountry).code);

    setBookingLoading(true);
    setBookingError(null);

    try {
      const res: any = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: selectedService.id,
          staffId: selectedSlot.staffId,
          startTime: selectedSlot.startTime,
          customerName: formalFullName,
          customerEmail: customerEmail.trim(),
          customerPhone: normalizedCustomerPhone,
          bookingForSomeoneElse,
          recipientName: recipientFullName,
          recipientEmail: recipientEmail.trim() || undefined,
          recipientPhone: normalizedRecipientPhone,
          notes: notes.trim(),
        }),
      });

      setCompletedBooking(res.booking);
      toast.success('Appointment booked successfully!', {
        description: `Booking Reference: ${res.booking.bookingReference}`
      });

      if (authenticatedCustomer && !authenticatedCustomer.phone) {
        const updatedCustomer = { ...authenticatedCustomer, phone: normalizedCustomerPhone };
        setAuthenticatedCustomer(updatedCustomer);
        localStorage.setItem('appointmo_user', JSON.stringify(updatedCustomer));
      }

      // Clear all customer input fields upon successful booking
      setCustomerFirstName('');
      setCustomerMiddleName('');
      setCustomerLastName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setBookingForSomeoneElse(false);
      setRecipientFirstName('');
      setRecipientMiddleName('');
      setRecipientLastName('');
      setRecipientEmail('');
      setRecipientPhone('');
      setNotes('');

      // Persist latest booking reference and management token to localStorage for instant 1-click management access
      if (res?.booking?.bookingReference && res?.booking?.managementToken) {
        localStorage.setItem('appointmo_latest_booking', JSON.stringify({
          bookingReference: res.booking.bookingReference,
          managementToken: res.booking.managementToken,
          customerName: formalFullName,
          customerEmail: customerEmail.trim(),
          customerPhone: normalizedCustomerPhone,
          serviceName: selectedService.name,
          createdAt: new Date().toISOString()
        }));

        // Also append to customer's personal bookings list in localStorage
        try {
          const listRaw = localStorage.getItem('appointmo_user_bookings');
          const list: any[] = listRaw ? JSON.parse(listRaw) : [];
          if (!list.some(b => b.bookingReference === res.booking.bookingReference)) {
            list.unshift({
              bookingReference: res.booking.bookingReference,
              managementToken: res.booking.managementToken,
              serviceName: selectedService.name,
              customerEmail,
              createdAt: new Date().toISOString()
            });
            localStorage.setItem('appointmo_user_bookings', JSON.stringify(list.slice(0, 50)));
          }
        } catch (_) {}
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
      {/* Main Header */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 py-4 px-3 sm:px-6 mb-8 shadow-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-6">
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
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-stone-900 dark:text-stone-100">{business?.name || 'Appointmo Booking'}</h1>
                <p className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <span>{business?.category || 'Intelligent Scheduling'}</span>
                  {business && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${business.operationalStatus === 'temporarily_closed' ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${business.operationalStatus === 'temporarily_closed' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      {business.operationalStatus === 'temporarily_closed' ? 'Temporarily closed' : 'Open for bookings'}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <ThemeToggle />
            <button
              onClick={() => navigate(`/concierge?business=${business?.slug || ''}`)}
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
        {/* Navigation Mode Banner */}
        <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-100">
          <div>
            <span className="font-bold">Not sure which service fits your goals or schedule?</span>
            <p className="text-amber-800 dark:text-amber-200/90 text-[11px] mt-0.5 font-medium">Let our Concierge find the ideal service and time slot for your budget.</p>
          </div>
          <button
            onClick={() => navigate(`/concierge?business=${business?.slug || ''}`)}
            className="shrink-0 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold px-3.5 py-2 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow text-xs flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-stone-950" />
            <span>Try Concierge Booking</span>
          </button>
        </div>

        {business?.operationalStatus === 'temporarily_closed' && (
          <StoreOperationalStatusNotice
            reason={business.temporaryClosureReason}
            expectedReopenAt={business.expectedReopenAt}
            timezone={business.timezone}
            className="mb-6"
          />
        )}

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
                Your appointment request has been sent to the studio for review. The booking contact remains responsible for managing it.
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
              {completedBooking.appointment?.recipientName && (
                <div className="flex justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                  <span className="text-stone-600 dark:text-stone-300 font-sans font-medium">Service recipient:</span>
                  <span className="text-stone-800 dark:text-stone-200 font-medium">{completedBooking.appointment.recipientName}</span>
                </div>
              )}
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
          <form onSubmit={handleBookingSubmit} autoComplete="off" className="space-y-6">
            {/* Step Wizard Indicator */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3 sm:p-4 shadow-sm">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`flex items-center space-x-2 p-2 sm:p-3 rounded-xl transition text-left ${
                    currentStep === 1
                      ? 'bg-stone-900 text-white dark:bg-amber-400 dark:text-stone-950 font-bold'
                      : selectedService
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                      : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
                    currentStep === 1
                      ? 'bg-white/20 dark:bg-stone-950/20'
                      : selectedService
                      ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
                      : 'bg-stone-200 dark:bg-stone-700'
                  }`}>
                    {selectedService && currentStep !== 1 ? '✓' : '1'}
                  </span>
                  <div className="hidden sm:block truncate">
                    <p className="text-xs leading-none">Service</p>
                    <p className="text-[10px] opacity-80 truncate mt-0.5">{selectedService?.name || 'Choose service'}</p>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!selectedService}
                  onClick={() => selectedService && setCurrentStep(2)}
                  className={`flex items-center space-x-2 p-2 sm:p-3 rounded-xl transition text-left disabled:opacity-40 ${
                    currentStep === 2
                      ? 'bg-stone-900 text-white dark:bg-amber-400 dark:text-stone-950 font-bold'
                      : selectedSlot
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                      : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
                    currentStep === 2
                      ? 'bg-white/20 dark:bg-stone-950/20'
                      : selectedSlot
                      ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
                      : 'bg-stone-200 dark:bg-stone-700'
                  }`}>
                    {selectedSlot && currentStep !== 2 ? '✓' : '2'}
                  </span>
                  <div className="hidden sm:block truncate">
                    <p className="text-xs leading-none">Schedule</p>
                    <p className="text-[10px] opacity-80 truncate mt-0.5">{selectedSlot ? new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pick date & slot'}</p>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => selectedSlot && setCurrentStep(3)}
                  className={`flex items-center space-x-2 p-2 sm:p-3 rounded-xl transition text-left disabled:opacity-40 ${
                    currentStep === 3
                      ? 'bg-stone-900 text-white dark:bg-amber-400 dark:text-stone-950 font-bold'
                      : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
                    currentStep === 3 ? 'bg-white/20 dark:bg-stone-950/20' : 'bg-stone-200 dark:bg-stone-700'
                  }`}>
                    3
                  </span>
                  <div className="hidden sm:block truncate">
                    <p className="text-xs leading-none">Details</p>
                    <p className="text-[10px] opacity-80 truncate mt-0.5">Guest & Confirm</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Chunk 1: Select Service */}
            {currentStep === 1 && (
              <div className="bg-stone-50/80 dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                      Step 1: Select a Service
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Choose which treatment or consultation you would like to book.</p>
                  </div>
                  {selectedService && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Selected</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedService(s);
                        setSelectedSlot(null);
                      }}
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

                <div className="flex justify-end pt-4 border-t border-stone-200 dark:border-stone-800">
                  <button
                    type="button"
                    disabled={!selectedService || business?.operationalStatus === 'temporarily_closed'}
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-2.5 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow flex items-center space-x-2 disabled:opacity-40"
                  >
                    <span>{business?.operationalStatus === 'temporarily_closed' ? 'Temporarily Closed' : 'Continue to Schedule'}</span>
                    {business?.operationalStatus !== 'temporarily_closed' && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Chunk 2: Date & Available Time Slot */}
            {currentStep === 2 && (
              <div className="bg-stone-50/80 dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                      Step 2: Choose Date & Available Slot
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Selected: <strong className="text-stone-800 dark:text-stone-200">{selectedService?.name}</strong> (₱{selectedService?.price})
                    </p>
                  </div>
                  {selectedSlot && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Slot Chosen</span>
                    </span>
                  )}
                </div>

                {business?.operationalStatus === 'temporarily_closed' ? (
                  <StoreOperationalStatusNotice
                    reason={business.temporaryClosureReason}
                    expectedReopenAt={business.expectedReopenAt}
                    timezone={business.timezone}
                  />
                ) : (
                  <>
                <div className="bg-white dark:bg-stone-800/60 p-4 rounded-2xl border border-stone-200 dark:border-stone-700">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">Select Appointment Date</label>
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
                      onClick={() => navigate('/concierge')}
                      className="text-stone-900 dark:text-amber-400 font-bold underline"
                    >
                      Concierge
                    </button>
                    .
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">Available Time Openings</label>
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
                  </div>
                )}
                  </>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-stone-200 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    Back to Services
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSlot || business?.operationalStatus === 'temporarily_closed'}
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-2.5 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow flex items-center space-x-2 disabled:opacity-40"
                  >
                    <span>Continue to Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Chunk 3: Customer Information & Final Confirmation */}
            {currentStep === 3 && (
              <div className="bg-stone-50/80 dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4 animate-in fade-in">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                    Step 3: Booking Contact & Confirmation
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {authenticatedCustomer
                      ? 'Your signed-in account owns this booking. Add a recipient if someone else will receive the service.'
                      : 'Enter the contact details for the person responsible for this booking.'}
                  </p>
                </div>

                {/* Booking Summary Card */}
                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-amber-950 dark:text-amber-100 text-sm block">{selectedService?.name}</span>
                    <span className="text-amber-800 dark:text-amber-300 text-xs mt-0.5 block">
                      {new Date(selectedSlot?.startTime || '').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(selectedSlot?.startTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Specialist: {selectedSlot?.staffName}
                    </span>
                  </div>
                  <span className="text-base font-extrabold text-stone-900 dark:text-amber-400">₱{selectedService?.price}</span>
                </div>

                {bookingError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bookingError}</span>
                  </div>
                )}

                <div className="space-y-4 text-xs">
                  {authenticatedCustomer ? (
                    <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/60 p-4 space-y-2">
                      <div className="text-[10px] uppercase tracking-wide font-bold text-stone-500">Booking owner account</div>
                      <div className="font-bold text-stone-900 dark:text-stone-100">{authenticatedCustomer.name || customerFirstName}</div>
                      <div className="text-stone-600 dark:text-stone-300">{authenticatedCustomer.email || customerEmail}</div>
                      {authenticatedCustomer.phone ? (
                        <div className="text-stone-600 dark:text-stone-300">{authenticatedCustomer.phone}</div>
                      ) : (
                        <label className="block space-y-1.5 pt-1">
                          <span className="font-semibold text-stone-700 dark:text-stone-300">Add your phone number to continue</span>
                          <CountryPhoneInput
                            countryNameOrCode={business?.country || 'Philippines'}
                            value={customerPhone}
                            onChange={setCustomerPhone}
                            required
                            autoComplete="tel"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="text-[10px] uppercase tracking-wide font-bold text-stone-500">Booking contact</div>
                      <FormalNameFields
                        firstName={customerFirstName}
                        middleName={customerMiddleName}
                        lastName={customerLastName}
                        onFirstNameChange={setCustomerFirstName}
                        onMiddleNameChange={setCustomerMiddleName}
                        onLastNameChange={setCustomerLastName}
                        required={true}
                        autoComplete="off"
                        labels={{ first: 'First Name', middle: 'Middle Initial / Name', last: 'Last Name' }}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Email Address <span className="text-rose-500 font-bold">* (Required)</span>
                          </label>
                          <input
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="beatriz@example.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Phone Number <span className="text-rose-500 font-bold">* (Required)</span>
                          </label>
                          <CountryPhoneInput
                            countryNameOrCode={business?.country || 'Philippines'}
                            value={customerPhone}
                            onChange={setCustomerPhone}
                            required
                            autoComplete="tel"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <label className="flex items-start gap-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bookingForSomeoneElse}
                      onChange={(event) => setBookingForSomeoneElse(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>
                      <span className="block font-semibold text-stone-800 dark:text-stone-200">I’m booking for someone else</span>
                      <span className="block text-[10px] text-stone-500 mt-0.5">The booking stays with the contact above; the store will see who is receiving the service.</span>
                    </span>
                  </label>

                  {bookingForSomeoneElse && (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
                      <div>
                        <h3 className="font-bold text-stone-800 dark:text-stone-200">Person receiving the service</h3>
                        <p className="text-[10px] text-stone-500 mt-0.5">These details help the store prepare for the appointment.</p>
                      </div>
                      <FormalNameFields
                        firstName={recipientFirstName}
                        middleName={recipientMiddleName}
                        lastName={recipientLastName}
                        onFirstNameChange={setRecipientFirstName}
                        onMiddleNameChange={setRecipientMiddleName}
                        onLastNameChange={setRecipientLastName}
                        required={true}
                        autoComplete="off"
                        labels={{ first: 'Recipient First Name', middle: 'Middle Initial / Name', last: 'Recipient Last Name' }}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block space-y-1">
                          <span className="font-semibold text-stone-700 dark:text-stone-300">Recipient email <span className="text-stone-400 font-normal">(Optional)</span></span>
                          <input
                            type="email"
                            autoComplete="off"
                            value={recipientEmail}
                            onChange={(event) => setRecipientEmail(event.target.value)}
                            placeholder="recipient@example.com"
                            className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="font-semibold text-stone-700 dark:text-stone-300">Recipient phone <span className="text-stone-400 font-normal">(Optional)</span></span>
                          <CountryPhoneInput
                            countryNameOrCode={business?.country || 'Philippines'}
                            value={recipientPhone}
                            onChange={setRecipientPhone}
                            autoComplete="off"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Notes / Preferences <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Any special requests or instructions..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-stone-200 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    Back to Schedule
                  </button>
                  <button
                    type="submit"
                    disabled={
                      bookingLoading ||
                      !selectedSlot ||
                      !customerFirstName.trim() ||
                      !customerLastName.trim() ||
                      !customerEmail.trim() ||
                      !validateFullPhoneNumber(customerPhone, business?.country || 'Philippines', true).isValid ||
                      (bookingForSomeoneElse && (
                        !recipientFirstName.trim() ||
                        !recipientLastName.trim() ||
                        (Boolean(recipientPhone.trim()) && !validateFullPhoneNumber(recipientPhone, business?.country || 'Philippines', true).isValid)
                      ))
                    }
                    className="bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold px-7 py-3 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition text-xs shadow-md disabled:opacity-50 flex items-center space-x-2"
                  >
                    <span>{bookingLoading ? 'Reserving...' : 'Confirm Appointment Booking'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
