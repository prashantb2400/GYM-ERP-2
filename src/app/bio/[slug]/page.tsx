import React from 'react';
import Link from 'next/link';
import { Dumbbell, MapPin, Phone, MessageSquare, Ticket, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';

interface BioPageProps {
  params: Promise<{ slug: string }>;
}

export default async function GymBioPage({ params }: BioPageProps) {
  const { slug } = await params;
  const formattedGymName = slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-start p-4 py-12 selection:bg-orange-500 selection:text-white">
      {/* Background Accent Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-64 bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none blur-3xl -z-10" />

      <main className="w-full max-w-md flex flex-col items-center">
        {/* Gym Avatar / Logo */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 p-0.5 shadow-xl shadow-orange-500/20">
            <div className="w-full h-full bg-zinc-900 rounded-[14px] flex items-center justify-center">
              <Dumbbell className="w-10 h-10 text-orange-400" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-1 border border-zinc-700">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Gym Title & Verified Badge */}
        <div className="flex items-center gap-1.5 mb-1">
          <h1 className="text-xl font-bold tracking-tight text-white">{formattedGymName}</h1>
          <CheckCircle2 className="w-4 h-4 text-orange-400 fill-orange-400/20" />
        </div>

        <p className="text-xs text-zinc-400 text-center max-w-xs mb-4">
          Premier Fitness, Strength & Conditioning Center. Open 7 days a week with certified trainers.
        </p>

        {/* Operating Hours Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 mb-6">
          <Clock className="w-3.5 h-3.5 text-orange-400" />
          <span>Mon - Sat: 5:30 AM - 10:30 PM | Sun: 6 AM - 2 PM</span>
        </div>

        {/* Action Link Stack (Inspired by Zerodha linkpage) */}
        <div className="w-full space-y-3">
          {/* Trial Pass CTA (Highlighted) */}
          <Link
            href={`/kiosk/guest?gym=${slug}`}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold text-sm shadow-lg shadow-orange-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <Ticket className="w-5 h-5" />
              <span>Claim 1-Day Free Trial Pass</span>
            </div>
            <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full font-medium">Free</span>
          </Link>

          {/* Membership Plans */}
          <Link
            href={`/kiosk?gym=${slug}`}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-medium text-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <Dumbbell className="w-5 h-5 text-orange-400" />
              <span>Membership Plans & Pricing</span>
            </div>
            <span className="text-zinc-500 text-xs">&rarr;</span>
          </Link>

          {/* WhatsApp Front Desk */}
          <a
            href="https://wa.me/?text=Hi%2C%20I%20would%20like%20to%20inquire%20about%20gym%20membership"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-medium text-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <span>Chat with Front Desk on WhatsApp</span>
            </div>
            <span className="text-zinc-500 text-xs">&rarr;</span>
          </a>

          {/* Google Maps Location */}
          <a
            href="https://maps.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-medium text-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-rose-400" />
              <span>Gym Location & Driving Directions</span>
            </div>
            <span className="text-zinc-500 text-xs">&rarr;</span>
          </a>

          {/* Phone Call */}
          <a
            href="tel:+919876543210"
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-medium text-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-sky-400" />
              <span>Call Front Desk Reception</span>
            </div>
            <span className="text-zinc-500 text-xs">&rarr;</span>
          </a>
        </div>

        {/* Amenities Highlights */}
        <div className="w-full mt-8 pt-6 border-t border-zinc-800/80">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-center mb-3">
            Facility Features
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {['100% Air Conditioned', 'Free Valet Parking', 'Steam & Sauna', 'Certified Trainers', 'Biometric Check-in', 'Locker Rooms'].map(amenity => (
              <span
                key={amenity}
                className="px-2.5 py-1 rounded-md bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-[11px] text-zinc-600">
          <p>Powered by <span className="text-zinc-400 font-medium">GymERP</span></p>
          <p className="mt-1">Linkpage Architecture Inspired by Zerodha FOSS</p>
        </footer>
      </main>
    </div>
  );
}
