import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Fuel, 
  Compass, 
  Users, 
  MessageCircle, 
  ChevronRight, 
  Phone, 
  MapPin, 
  CheckCircle2,
  CalendarDays,
  Sparkles
} from 'lucide-react';

export default function ScorpioShowcase() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Frame calculations matching the video's scroll range
  const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const progress = Math.min(Math.max(scrollY / (winHeight * 2.2), 0), 1);

  // Dynamic car movement: slides across the viewport and rotates slightly
  const carX = -20 + progress * 40; // Glides horizontally
  const carScale = 0.95 + Math.sin(progress * Math.PI) * 0.15;
  const carRotate = (progress - 0.5) * -6;

  // Active angle selection based on scroll progression
  const getCarImage = () => {
    if (progress < 0.25) return '/cars/scorpio-angle-l.png';
    if (progress < 0.55) return '/cars/scorpio-front.png';
    if (progress < 0.82) return '/cars/scorpio-side-r.png';
    return '/cars/scorpio-high.png';
  };

  return (
    <div className="relative bg-[#070709] text-white font-sans selection:bg-amber-400 selection:text-black">
      
      {/* 1. TOP NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-lg">
            S
          </div>
          <span className="font-extrabold tracking-tight text-lg text-white">
            SAWARIYA <span className="text-amber-400">RENTALS</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          <a href="#overview" className="hover:text-amber-400 transition">Overview</a>
          <a href="#specs" className="hover:text-amber-400 transition">Specifications</a>
          <a href="#fleet" className="hover:text-amber-400 transition">Full Fleet</a>
          <a href="#booking" className="hover:text-amber-400 transition">Pricing</a>
        </div>

        <a
          href="https://wa.me/917415228011?text=Hi%20Sawariya%20Rentals,%20I%20want%20to%20rent%20the%20Scorpio%20N."
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-bold px-5 py-2.5 rounded-full text-xs transition tracking-wide"
        >
          <Phone size={14} />
          <span>74152 28011</span>
        </a>
      </nav>

      {/* 2. THE STICKY SCROLL STAGE (Autoklasa Style) */}
      <div className="relative h-[320vh]">
        
        {/* Pinned Screen Viewport */}
        <div className="sticky top-0 h-screen w-full flex flex-col justify-center items-center overflow-hidden pointer-events-none">
          
          {/* Ambient Studio Lighting */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-500/10 blur-[150px] rounded-full" />
          <div className="absolute bottom-10 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

          {/* Background Typography */}
          <div className="absolute top-24 md:top-28 text-center px-4 transition-all duration-300">
            <span className="text-amber-400 text-xs font-bold uppercase tracking-widest block mb-2">
              Command The Road
            </span>
            <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-none text-white/95">
              MAHINDRA SCORPIO N
            </h1>
          </div>

          {/* Centered Scorpio N that glides & switches perspective */}
          <div className="relative z-20 w-full max-w-5xl px-6 flex justify-center items-center transition-transform duration-100 ease-out">
            <img
              src={getCarImage()}
              alt="Mahindra Scorpio N"
              className="w-full max-h-[55vh] object-contain drop-shadow-[0_35px_60px_rgba(0,0,0,0.95)]"
              style={{
                transform: `translateX(${carX}%) scale(${carScale}) rotate(${carRotate}deg)`,
              }}
            />
          </div>

          {/* Dynamic Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-zinc-500 text-xs font-semibold tracking-widest uppercase">
            <span>Scroll To Inspect</span>
            <div className="w-8 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-400 transition-all duration-75"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Narrative Scroll Milestones (Text that glides past the pinned car) */}
        <div className="relative z-30 pointer-events-none max-w-6xl mx-auto px-6">
          
          {/* Milestone 1 */}
          <div className="h-screen flex items-end pb-24">
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl max-w-md pointer-events-auto shadow-2xl">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">01 / Drivetrain</span>
              <h3 className="text-2xl font-black">4XPLOR Intelligent Terrain Modes</h3>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                Tackle sand, mud, gravel, and wet tarmac across Madhya Pradesh with intelligent shift-on-fly 4WD.
              </p>
            </div>
          </div>

          {/* Milestone 2 */}
          <div className="h-screen flex items-center justify-end">
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl max-w-md pointer-events-auto shadow-2xl">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">02 / Powertrain</span>
              <h3 className="text-2xl font-black">2.2L mHawk Turbo Diesel</h3>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                172 BHP and 400 Nm of pure pulling torque. High-speed stability and commanding overtaking power.
              </p>
            </div>
          </div>

          {/* Milestone 3 */}
          <div className="h-screen flex items-center">
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl max-w-md pointer-events-auto shadow-2xl">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">03 / Safety</span>
              <h3 className="text-2xl font-black">5-Star NCAP Architecture</h3>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                High-strength steel chassis, ESC, disc brakes on all four corners, and 6 airbags for maximum family security.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 3. PERFORMANCE & SPECS MATRIX */}
      <section id="specs" className="relative z-30 max-w-6xl mx-auto px-6 py-28 border-t border-zinc-900">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Engineered Authority</span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mt-2">TECHNICAL SPECIFICATIONS</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Compass, label: 'Drivetrain', val: '4XPLOR 4WD with Rear Diff Lock' },
            { icon: Fuel, label: 'Engine Output', val: '172 BHP @ 3500 rpm' },
            { icon: Users, label: 'Seating Capacity', val: '7-Seater Premium Layout' },
            { icon: ShieldCheck, label: 'Safety Rating', val: '5-Star Global NCAP Certified' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-zinc-950/80 border border-zinc-800/80 p-6 rounded-2xl flex flex-col justify-between">
                <Icon size={24} className="text-amber-400 mb-4" />
                <div>
                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">{item.label}</span>
                  <strong className="text-base font-bold text-zinc-200 mt-1 block">{item.val}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. DIRECT BOOKING SECTION */}
      <section id="booking" className="relative z-30 max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-b from-zinc-900/80 to-black border border-zinc-800 rounded-3xl p-8 md:p-14 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Self-Drive Fleet Booking</span>
            <h3 className="text-3xl md:text-4xl font-black mt-2">Rent the Mahindra Scorpio N Today</h3>
            <p className="text-zinc-400 text-sm max-w-md mt-2">
              Available in Indore & Bhopal. Doorstep delivery, clean sanitized interiors, and zero hidden paperwork charges.
            </p>
            <div className="flex flex-wrap gap-4 mt-6 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-400" /> Transparent Advance</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-400" /> Valid 18+ DL</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-400" /> 24/7 Roadside Assist</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <a
              href="https://wa.me/917415228011?text=Hi%20Sawariya%20Rentals,%20I%20want%20to%20book%20the%20Scorpio%20N."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-8 py-4 rounded-full text-sm transition shadow-lg shadow-emerald-500/20"
            >
              <MessageCircle size={18} />
              Book on WhatsApp
            </a>
            <a
              href="tel:+917415228011"
              className="inline-flex items-center justify-center gap-2 border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-white font-bold px-8 py-4 rounded-full text-sm transition"
            >
              <Phone size={18} />
              Call Now
            </a>
          </div>
        </div>
      </section>

      {/* 5. MINIMAL LUXURY FOOTER */}
      <footer className="relative z-30 border-t border-zinc-900 py-12 px-6 text-center text-xs text-zinc-500">
        <p>© {new Date().getFullYear()} Sawariya Rentals. All rights reserved. Self-drive car rentals in Indore & Bhopal.</p>
      </footer>

    </div>
  );
}
