import React, { useState } from 'react';
import { 
  Compass, 
  Fuel, 
  ShieldCheck, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  PhoneCall, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';

const ANGLES = [
  { id: 'front', label: 'Front', src: '/cars/scorpio-front.png', desc: 'Dominant Chrome Grille & LED DRLs' },
  { id: 'angle-l', label: '3/4 Left', src: '/cars/scorpio-angle-l.png', desc: 'Muscular Wheel Arches & R18 Alloys' },
  { id: 'side-l', label: 'Side Left', src: '/cars/scorpio-side-l.png', desc: '4,662 mm Extended Stance' },
  { id: 'rear', label: 'Rear', src: '/cars/scorpio-rear.png', desc: 'Signature Vertical Tail Lamps' },
  { id: 'side-r', label: 'Side Right', src: '/cars/scorpio-side-r.png', desc: 'High Ground Clearance Profile' },
  { id: 'angle-r', label: '3/4 Right', src: '/cars/scorpio-angle-r.png', desc: 'Aerodynamic Stance' },
  { id: 'high', label: 'Perspective', src: '/cars/scorpio-high.png', desc: 'Commanding Road View' },
  { id: 'top', label: 'Aerial', src: '/cars/scorpio-top.png', desc: 'Electric Sunroof & Roof Rails' },
];

const HIGHLIGHTS = [
  { icon: Compass, title: '4XPLOR 4WD', subtitle: 'Terrain Management' },
  { icon: Fuel, title: '2.2L mHawk Turbo', subtitle: '172 BHP / 400 Nm' },
  { icon: ShieldCheck, title: '5-Star NCAP', subtitle: 'Global Safety Rating' },
  { icon: Users, title: '7-Seater Luxury', subtitle: 'Plush Captain Chairs' },
];

export default function ScorpioShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextAngle = () => {
    setCurrentIndex((prev) => (prev + 1) % ANGLES.length);
  };

  const prevAngle = () => {
    setCurrentIndex((prev) => (prev - 1 + ANGLES.length) % ANGLES.length);
  };

  return (
    <section className="relative w-full min-h-screen bg-[#070709] text-white py-16 px-4 md:px-8 overflow-hidden select-none">
      {/* Editorial Ambient Background Glow */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-500/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-zinc-800/30 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header Tagline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 backdrop-blur-md mb-4">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-xs uppercase tracking-widest text-amber-300 font-semibold">
              Sawariya Rentals • Flagship Fleet
            </span>
          </div>

          <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-none">
            MAHINDRA{' '}
            <span className="bg-gradient-to-r from-white via-amber-200 to-amber-500 bg-clip-text text-transparent">
              SCORPIO N
            </span>
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto mt-4">
            Commanding presence and raw 4x4 power. Available for self-drive expeditions across Bhopal, Indore, and Madhya Pradesh.
          </p>
        </div>

        {/* Interactive Viewer Stage */}
        <div className="relative w-full aspect-[16/10] md:aspect-[21/9] bg-gradient-to-b from-zinc-900/40 via-zinc-950/70 to-black rounded-3xl border border-zinc-800/80 flex items-center justify-center p-6 shadow-2xl overflow-hidden group">
          
          <div className="absolute bottom-8 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          <div className="absolute bottom-0 w-2/3 h-20 bg-amber-500/5 blur-3xl pointer-events-none" />

          {/* Active Car Image Display */}
          <img
            key={ANGLES[currentIndex].src}
            src={ANGLES[currentIndex].src}
            alt={ANGLES[currentIndex].label}
            className="w-full h-full object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.95)] transition-all duration-300 ease-out transform group-hover:scale-[1.02]"
          />

          {/* Left / Right Nav Arrows */}
          <button
            onClick={prevAngle}
            aria-label="Previous Angle"
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-zinc-900/80 border border-zinc-700/60 hover:bg-amber-400 hover:text-black transition duration-200"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={nextAngle}
            aria-label="Next Angle"
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-zinc-900/80 border border-zinc-700/60 hover:bg-amber-400 hover:text-black transition duration-200"
          >
            <ChevronRight size={22} />
          </button>

          {/* Angle Overlay */}
          <div className="absolute top-4 left-4 md:top-6 md:left-6 bg-black/60 backdrop-blur-md border border-zinc-800/80 px-4 py-2 rounded-2xl">
            <span className="text-[10px] uppercase tracking-widest text-amber-400 block font-semibold">Viewpoint</span>
            <span className="text-sm md:text-base font-bold text-white">{ANGLES[currentIndex].label}</span>
          </div>

          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 bg-black/60 backdrop-blur-md border border-zinc-800/80 px-4 py-2 rounded-2xl hidden sm:block">
            <span className="text-xs text-zinc-300">{ANGLES[currentIndex].desc}</span>
          </div>
        </div>

        {/* Angle Selection Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6 p-2 bg-zinc-950/80 border border-zinc-800/90 rounded-2xl backdrop-blur-md max-w-fit mx-auto">
          {ANGLES.map((angle, idx) => (
            <button
              key={angle.id}
              onClick={() => setCurrentIndex(idx)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                currentIndex === idx
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20 scale-105'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              {angle.label}
            </button>
          ))}
        </div>

        {/* Specifications Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          {HIGHLIGHTS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-400/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-amber-400/10 rounded-lg text-amber-400">
                    <Icon size={18} />
                  </div>
                  <span className="text-xs uppercase text-zinc-400 tracking-wider font-semibold">{item.title}</span>
                </div>
                <span className="text-sm md:text-base font-bold text-zinc-200">{item.subtitle}</span>
              </div>
            );
          })}
        </div>

        {/* WhatsApp & Instant Booking Action Strip */}
        <div className="mt-8 bg-zinc-950/90 border border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-xs text-amber-400 uppercase tracking-widest font-bold">Guaranteed Pristine Condition</span>
            <h3 className="text-xl md:text-2xl font-bold mt-1">Book Your Scorpio N Self-Drive Experience</h3>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-400" /> Doorstep Delivery</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-400" /> No Hidden Charges</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-400" /> 24/7 Road Assistance</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <a
              href="https://wa.me/?text=Hi%20Sawariya%20Rentals,%20I%20want%20to%20rent%20the%20Mahindra%20Scorpio%20N."
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-3.5 rounded-2xl transition shadow-lg shadow-emerald-500/20 text-sm"
            >
              <PhoneCall size={18} />
              Book on WhatsApp
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
