import React, { useEffect, useMemo, useState } from "react";
import {
  Car,
  MapPin,
  CalendarDays,
  Phone,
  User,
  IndianRupee,
  ShieldCheck,
  Settings,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Clock3,
  CreditCard,
  Camera,
  ImagePlus,
  Search,
  Sparkles,
  Compass,
  ArrowRight,
  ChevronRight,
  Star,
  Check
} from "lucide-react";
import {
  fetchCars,
  upsertCar,
  deleteCar as deleteCarCloud,
  fetchCities,
  upsertCity,
  fetchBookings,
  insertBooking,
  uploadPhoto,
  insertLead,
  fetchLeads,
} from "./supabase";

/* =========================================================
   CONFIG & COLOR PALETTE (Modern Dark/Gold Royalty Palette)
========================================================= */

const C = {
  navy: "#0b0f19",       // Deep Slate Navy
  cardBg: "#111827",     // Card Dark Slate
  border: "#1f2937",     // Subtle Dark Border
  gold: "#f59e0b",       // Electric Gold / Amber Accent
  goldHover: "#d97706",
  goldLight: "rgba(245, 158, 11, 0.12)",
  green: "#10b981",      // Emerald Success
  greenLight: "rgba(16, 185, 129, 0.12)",
  red: "#ef4444",
  redLight: "rgba(239, 68, 68, 0.12)",
  gray: "#9ca3af",       // Soft Slate Text
  grayLight: "#1f2937",
  bgLight: "#f8fafc",    // Clean White Theme Base
  white: "#ffffff",
  black: "#030712",
};

const ADMIN_PASSCODE = "7224";
const BOOKING_ADVANCE = 500;

/* =========================================================
   INITIAL DATA
========================================================= */

const seedCities = [
  { id: "city-indore", name: "Indore", active: true },
  { id: "city-bhopal", name: "Bhopal", active: true },
  { id: "city-ujjain", name: "Ujjain", active: true },
];

const DEFAULT_BUSINESS_SETTINGS = {
  hourlyStartingPrice: 83,
  hourlyIncludedKm: 20,
  dailyStartingPrice: 2200,
  dailyIncludedKm: 280,
  weeklyStartingPrice: 8500,
  monthlyStartingPrice: 40000,
  longTermMonthlyPrice: 18000,
  longTermMonths: 24,
  extraKmRate: 6,
  driverCostPerDay: 1000,
  cngCostPerKm: 4.5,
  dieselCostPerKm: 9.25,
  petrolCostPerKm: 7.5,
  guideCostPerDay: 800,
  returnTimeCostPerHour: 250,
  deliveryFlatCharge: 0,
  marginPercent: 10,
  bookingAdvance: 500,
};

const TOURIST_DESTINATIONS = [
  { id: "ujjain", name: "Ujjain (Mahakal Lok)", distance: "55 km from Indore", description: "Mahakaleshwar Jyotirlinga & River Ghats.", img: "https://images.unsplash.com/photo-1627894483216-2138af692e32?auto=format&fit=crop&w=600&q=80" },
  { id: "omkareshwar", name: "Omkareshwar", distance: "78 km from Indore", description: "Sacred Jyotirlinga island on the Narmada River.", img: "https://images.unsplash.com/photo-1609949279531-cf48d64bed89?auto=format&fit=crop&w=600&q=80" },
  { id: "mandu", name: "Mandu Forts", distance: "95 km from Indore", description: "Historic Jahaz Mahal, Rani Roopmati Pavilion.", img: "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?auto=format&fit=crop&w=600&q=80" },
  { id: "maheshwar", name: "Maheshwar Ghats", distance: "91 km from Indore", description: "Ahilya Fort, Narmada River Ghats & Maheshwari Sarees.", img: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=600&q=80" },
  { id: "pachmarhi", name: "Pachmarhi Hill Station", distance: "330 km from Indore", description: "Bee Falls, Pandav Caves & Scenic Views.", img: "https://images.unsplash.com/photo-1589802829985-817e51171b92?auto=format&fit=crop&w=600&q=80" },
];

const DECORATION_PACKAGES = [
  { id: "wedding", name: "Wedding Special", icon: "💍", description: "Flowers, net ribbons, floral bonnet arrangement.", price: 2500 },
  { id: "birthday", name: "Birthday Blast", icon: "🎈", description: "Colourful balloons, party pops & happy birthday banner.", price: 1200 },
  { id: "anniversary", name: "Anniversary Romance", icon: "🌹", description: "Rose petal layout, LED lights & ribbon arches.", price: 1800 },
  { id: "proposal", name: "Surprise Proposal", icon: "💖", description: "Custom romantic fairy lights, balloons & heart decor.", price: 2200 },
];

const CITY_COORDS = {
  Indore: [22.7196, 75.8577],
  Bhopal: [23.2599, 77.4126],
  Ujjain: [23.1765, 75.7885],
  Omkareshwar: [22.2425, 76.1487],
  Mandu: [22.3333, 75.4],
  Maheshwar: [22.176, 75.583],
  Pachmarhi: [22.4674, 78.4346],
};

/* =========================================================
   HELPERS
========================================================= */

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fmtINR(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function loadShared(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveShared(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Storage error:", error);
  }
}

function calculateRouteEstimate(from, to) {
  if (!from || !to || from === to || !CITY_COORDS[from] || !CITY_COORDS[to]) return null;
  const [lat1, lon1] = CITY_COORDS[from];
  const [lat2, lon2] = CITY_COORDS[to];
  const R = 6371;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const straight = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.max(1, Math.round(straight * 1.18));
  const hours = Math.max(0.5, Math.round((distanceKm / 45) * 10) / 10);
  return { distanceKm, hours };
}

/* =========================================================
   COMPONENTS
========================================================= */

function Badge({ children, color = C.gold }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 999,
        background: `${color}18`,
        border: `1px solid ${color}33`,
        color: color,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/* =========================================================
   CAR CARD
========================================================= */

function CarCard({ car, onBook }) {
  const photos = car.photos || [];
  const photo = photos[0] || null;
  const price = Number(car.price24 || car.dailyRate || car.price12 || car.price8 || car.price || 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: C.white,
        border: `1px solid #e5e7eb`,
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
    >
      <div
        style={{
          height: 180,
          background: "linear-gradient(135deg, #1f2937, #111827)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt={car.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Car size={54} color={C.gold} strokeWidth={1.5} />
          </div>
        )}
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <Badge color={car.available !== false ? C.green : C.red}>
            {car.available !== false ? "Available" : "Rented"}
          </Badge>
        </div>
        <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", padding: "4px 10px", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700 }}>
          {car.city || "Indore"}
        </div>
      </div>

      <div style={{ padding: 18, display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: C.navy }}>{car.name}</h3>
          <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span>{car.type || "Hatchback"}</span> • <span>{car.fuel || "Petrol"}</span> • <span>{car.transmission || "Manual"}</span> • <span>{car.seats || 5} Seats</span>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Starts From</div>
            <div style={{ color: C.navy, fontSize: 20, fontWeight: 900 }}>
              {fmtINR(price)} <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>/day</span>
            </div>
          </div>
          <button
            type="button"
            disabled={car.available === false}
            onClick={() => onBook(car)}
            style={{
              background: car.available !== false ? C.gold : "#d1d5db",
              color: car.available !== false ? C.navy : "#6b7280",
              border: "none",
              borderRadius: 12,
              padding: "10px 20px",
              fontWeight: 900,
              cursor: car.available !== false ? "pointer" : "not-allowed",
              boxShadow: car.available !== false ? "0 4px 14px rgba(245,158,11,0.3)" : "none",
            }}
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   BOOKING MODAL
========================================================= */

function BookingModal({ car, initialDecor = null, initialDest = null, onClose, onConfirm }) {
  const settings = loadShared("sawariya_business_settings", DEFAULT_BUSINESS_SETTINGS);
  const minDate = todayISO();
  const [plan, setPlan] = useState("daily");
  const [tripType, setTripType] = useState(initialDest ? "oneway" : "round");
  const [serviceType, setServiceType] = useState("self");
  const [homeDelivery, setHomeDelivery] = useState(false);
  const [pickupCity, setPickupCity] = useState(car?.city || "Indore");
  const [dropCity, setDropCity] = useState(initialDest?.name || "");
  const [selectedDecor, setSelectedDecor] = useState(initialDecor || null);
  const [pickupDate, setPickupDate] = useState(minDate);
  const [pickupTime, setPickupTime] = useState("09:00");
  const [days, setDays] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentType, setPaymentType] = useState("advance");
  const [loading, setLoading] = useState(false);

  const route = useMemo(() => calculateRouteEstimate(pickupCity, dropCity), [pickupCity, dropCity]);
  const dailyRate = Number(car?.dailyRate ?? car?.price24 ?? settings.dailyStartingPrice);
  const decorPrice = selectedDecor ? selectedDecor.price : 0;

  let rental = dailyRate * Math.max(1, Number(days) || 1);
  const total = rental + decorPrice;
  const advance = Math.min(Number(settings.bookingAdvance || BOOKING_ADVANCE), total);
  const paymentAmount = paymentType === "advance" ? advance : total;

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (!name.trim()) return alert("Please enter your name.");
    if (!/^\d{10}$/.test(cleanPhone)) return alert("Please enter a valid 10-digit mobile number.");

    setLoading(true);
    try {
      const bookingData = {
        carId: car?.id || "decor-custom",
        carName: car?.name || "Decorated Car Rental",
        city: pickupCity,
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim(),
        pickupDate,
        pickupTime,
        rentalDuration: days * 24,
        total,
        paidAmount: paymentAmount,
        remainingAmount: total - paymentAmount,
        paymentType,
        status: "Pending",
        decoration: selectedDecor ? selectedDecor.name : null,
        destination: dropCity || null,
      };

      await onConfirm(bookingData);
      alert("Booking successfully placed!");
      onClose();
    } catch (err) {
      alert("Booking creation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={modalBackdrop}>
      <form onSubmit={handleSubmit} style={modalCard}>
        <div style={modalHeader}>
          <div>
            <Badge color={C.gold}>Booking Details</Badge>
            <h2 style={{ margin: "6px 0 0", color: C.navy, fontSize: 22 }}>{car ? car.name : "Car Rental Service"}</h2>
          </div>
          <button type="button" onClick={onClose} style={iconButton}><X size={20} /></button>
        </div>

        <div style={{ padding: 20, display: "grid", gap: 16 }}>
          {selectedDecor && (
            <div style={{ background: C.goldLight, border: `1px solid ${C.gold}`, borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Selected Decor: {selectedDecor.name}</strong>
                <div style={{ fontSize: 12, color: C.navy }}>{selectedDecor.description}</div>
              </div>
              <Badge color={C.gold}>+{fmtINR(selectedDecor.price)}</Badge>
            </div>
          )}

          <div style={fieldGrid}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit Mobile" inputMode="numeric" style={inputStyle} required />
            </div>
          </div>

          <div style={fieldGrid}>
            <div>
              <label style={labelStyle}>Pickup Date</label>
              <input type="date" min={minDate} value={pickupDate} onChange={e => setPickupDate(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Pickup Time</label>
              <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} style={inputStyle} required />
            </div>
          </div>

          <div style={fieldGrid}>
            <div>
              <label style={labelStyle}>Rental Days</label>
              <input type="number" min="1" max="30" value={days} onChange={e => setDays(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Destination / City</label>
              <input value={dropCity} onChange={e => setDropCity(e.target.value)} placeholder="e.g. Ujjain, Omkareshwar" style={inputStyle} />
            </div>
          </div>

          <div style={{ background: "#f9fafb", padding: 16, borderRadius: 14, border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Vehicle Rental ({days} days)</span>
              <strong>{fmtINR(rental)}</strong>
            </div>
            {selectedDecor && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span>Decoration ({selectedDecor.name})</span>
                <strong>{fmtINR(decorPrice)}</strong>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e5e7eb", paddingTop: 10, fontSize: 18, fontWeight: 900 }}>
              <span>Total Amount</span>
              <span style={{ color: C.navy }}>{fmtINR(total)}</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              type="button"
              onClick={() => setPaymentType("advance")}
              style={{
                padding: 12,
                borderRadius: 12,
                border: `2px solid ${paymentType === "advance" ? C.gold : "#e5e7eb"}`,
                background: paymentType === "advance" ? C.goldLight : "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Pay Advance ({fmtINR(advance)})
            </button>
            <button
              type="button"
              onClick={() => setPaymentType("full")}
              style={{
                padding: 12,
                borderRadius: 12,
                border: `2px solid ${paymentType === "full" ? C.gold : "#e5e7eb"}`,
                background: paymentType === "full" ? C.goldLight : "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Pay Full ({fmtINR(total)})
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: C.gold,
              color: C.navy,
              border: "none",
              borderRadius: 12,
              padding: 14,
              fontSize: 16,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(245,158,11,0.4)",
            }}
          >
            {loading ? "Processing..." : `Confirm Booking • ${fmtINR(paymentAmount)}`}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   CUSTOMER VIEW
========================================================= */

function CustomerView({ cars, cities, bookings, onBook, onOpenAdmin }) {
  const [selectedCity, setSelectedCity] = useState("All");
  const [search, setSearch] = useState("");
  const [bookingCar, setBookingCar] = useState(null);
  const [selectedDecor, setSelectedDecor] = useState(null);
  const [selectedDest, setSelectedDest] = useState(null);

  const activeCities = cities.filter((city) => city.active);

  const filteredCars = useMemo(() => {
    return cars.filter((car) => {
      const cityMatch = selectedCity === "All" || car.city === selectedCity;
      const searchText = search.trim().toLowerCase();
      const searchMatch =
        !searchText ||
        car.name.toLowerCase().includes(searchText) ||
        (car.type && car.type.toLowerCase().includes(searchText)) ||
        (car.city && car.city.toLowerCase().includes(searchText));

      return cityMatch && searchMatch;
    });
  }, [cars, selectedCity, search]);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: C.navy, fontFamily: "sans-serif" }}>
      {/* NAVIGATION BAR */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(11, 15, 25, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.border}`,
          color: "#fff",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Car color={C.navy} size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: 0.5, color: "#fff" }}>SAWARIYA</div>
              <div style={{ fontSize: 10, color: C.gold, fontWeight: 800, letterSpacing: 1.5, marginTop: -2 }}>RENTALS</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <button onClick={() => scrollToSection("destinations")} style={navLinkStyle}>Destinations</button>
            <button onClick={() => scrollToSection("decorations")} style={navLinkStyle}>Decorations</button>
            <button onClick={() => scrollToSection("fleet")} style={navLinkStyle}>Cars</button>
            <a
              href="https://wa.me/917415228011"
              target="_blank"
              rel="noreferrer"
              style={{
                background: C.gold,
                color: C.navy,
                padding: "8px 16px",
                borderRadius: 10,
                fontWeight: 800,
                textDecoration: "none",
                fontSize: 13,
              }}
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section
        style={{
          background: "linear-gradient(180deg, #0b0f19 0%, #111827 100%)",
          color: "#fff",
          padding: "60px 20px 80px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: 850, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <Badge color={C.gold}>
            <Sparkles size={14} /> Premium Self-Drive Experience
          </Badge>

          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 54px)",
              fontWeight: 900,
              margin: "20px 0 16px",
              lineHeight: 1.15,
              letterSpacing: "-0.5px",
            }}
          >
            Explore Indore & Beyond With <span style={{ color: C.gold }}>Sawariya Rentals</span>
          </h1>

          <p style={{ fontSize: 17, color: C.gray, maxWidth: 650, margin: "0 auto 28px", lineHeight: 1.6 }}>
            Hassle-free self-drive car rentals, tour packages to Ujjain & Omkareshwar, and customized car decorations for special occasions.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => scrollToSection("fleet")}
              style={{
                background: C.gold,
                color: C.navy,
                border: "none",
                padding: "14px 28px",
                borderRadius: 12,
                fontWeight: 900,
                fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(245, 158, 11, 0.4)",
              }}
            >
              Book a Car
            </button>
            <button
              onClick={() => scrollToSection("destinations")}
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: `1px solid ${C.border}`,
                padding: "14px 28px",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Explore Near Indore
            </button>
          </div>
        </div>
      </section>

      {/* TOURIST DESTINATIONS SECTION */}
      <section id="destinations" style={{ maxWidth: 1200, margin: "-40px auto 60px", padding: "0 20px", position: "relative", zIndex: 10 }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: 28, boxShadow: "0 20px 40px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
            <div>
              <Badge color={C.gold}><Compass size={14} /> Sightseeing</Badge>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: "8px 0 0", color: C.navy }}>Places to Visit Near Indore</h2>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {TOURIST_DESTINATIONS.map((dest) => (
              <div
                key={dest.id}
                onClick={() => {
                  setSelectedDest(dest);
                  setBookingCar(cars[0] || { name: "Self-Drive Car", price24: 2200 });
                }}
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                  cursor: "pointer",
                  transition: "transform 0.2s",
                  background: "#fff",
                }}
              >
                <div style={{ height: 120, position: "relative" }}>
                  <img src={dest.img} alt={dest.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }} />
                  <div style={{ position: "absolute", bottom: 8, left: 10, color: "#fff", fontWeight: 800, fontSize: 15 }}>
                    {dest.name}
                  </div>
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 11, color: C.gold, fontWeight: 800 }}>{dest.distance}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{dest.description}</div>
                  <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, color: C.navy, display: "flex", alignItems: "center", gap: 4 }}>
                    Book Tour <ArrowRight size={12} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAR DECORATION SECTION */}
      <section id="decorations" style={{ maxWidth: 1200, margin: "0 auto 60px", padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
          <div>
            <Badge color={C.gold}><Sparkles size={14} /> Celebrations</Badge>
            <h2 style={{ fontSize: 26, fontWeight: 900, margin: "8px 0 0", color: C.navy }}>Car Decoration Services</h2>
            <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 14 }}>Make your special moments memorable with decorated luxury & budget cars.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {DECORATION_PACKAGES.map((decor) => (
            <div
              key={decor.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 20,
                padding: 20,
                boxShadow: "0 10px 25px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{decor.icon}</div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: C.navy }}>{decor.name}</h3>
                <p style={{ color: "#6b7280", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{decor.description}</p>
              </div>

              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>STARTS AT</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.navy }}>{fmtINR(decor.price)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDecor(decor);
                    setBookingCar(cars[0] || { name: "Decorated Car Rental", price24: 2200 });
                  }}
                  style={{
                    background: C.navy,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 14px",
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Select Decor
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FLEET / CAR SEARCH SECTION */}
      <section id="fleet" style={{ maxWidth: 1200, margin: "0 auto 80px", padding: "0 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div>
            <Badge color={C.gold}><Car size={14} /> Our Fleet</Badge>
            <h2 style={{ fontSize: 26, fontWeight: 900, margin: "8px 0 0", color: C.navy }}>Select Your Rental Vehicle</h2>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ position: "relative", minWidth: 220 }}>
              <Search size={16} color="#9ca3af" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search car model..."
                style={{ ...inputStyle, paddingLeft: 36, background: "#fff" }}
              />
            </div>

            <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} style={{ ...inputStyle, width: 140, background: "#fff" }}>
              <option value="All">All Cities</option>
              {activeCities.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredCars.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb" }}>
            <Car size={48} color={C.gray} style={{ marginBottom: 12 }} />
            <h3 style={{ margin: 0, color: C.navy }}>No Cars Available Right Now</h3>
            <p style={{ color: C.gray, fontSize: 14 }}>Try adjusting your search terms or city filters.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {filteredCars.map((car) => (
              <CarCard key={car.id} car={car} onBook={(car) => setBookingCar(car)} />
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{ background: C.navy, color: "#fff", padding: "40px 20px 20px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 30, paddingBottom: 30, borderBottom: "1px solid #1f2937" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20, color: C.gold }}>SAWARIYA RENTALS</div>
            <p style={{ color: C.gray, fontSize: 13, maxWidth: 300, marginTop: 8 }}>
              Best self-drive car rental platform in Indore & Bhopal. Clean cars, honest pricing, and instant WhatsApp booking.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#fff", marginBottom: 10 }}>Contact & Location</div>
            <div style={{ color: C.gray, fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
              <span>Phone: 74152 28011 / 89828 02145</span>
              <span>City: Indore, Madhya Pradesh</span>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "20px auto 0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: C.gray }}>
          <span>© {new Date().getFullYear()} Sawariya Rentals. All rights reserved.</span>
          <button type="button" onClick={onOpenAdmin} style={{ background: "none", border: "none", color: C.gray, cursor: "pointer", fontSize: 12 }}>Admin Panel</button>
        </div>
      </footer>

      {/* MODAL */}
      {bookingCar && (
        <BookingModal
          car={bookingCar}
          initialDecor={selectedDecor}
          initialDest={selectedDest}
          onClose={() => {
            setBookingCar(null);
            setSelectedDecor(null);
            setSelectedDest(null);
          }}
          onConfirm={onBook}
        />
      )}
    </div>
  );
}

const navLinkStyle = {
  background: "none",
  border: "none",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

/* =========================================================
   ADMIN PANEL VIEW
========================================================= */

function AdminView({ cars, setCars, cities, setCities, bookings, onClose }) {
  const [tab, setTab] = useState("cars");

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f19", color: "#fff", padding: 20 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <Badge color={C.gold}>Admin Dashboard</Badge>
          <h1 style={{ margin: "6px 0 0", fontSize: 24, color: "#fff" }}>Sawariya Control Panel</h1>
        </div>
        <button onClick={onClose} style={{ background: C.gold, color: C.navy, border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 900, cursor: "pointer" }}>
          Exit Admin
        </button>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20 }}>
        <p style={{ color: C.gray }}>Manage your vehicle fleet, location availability, and existing customer bookings.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 20 }}>
          <div style={{ background: "#1f2937", padding: 16, borderRadius: 12 }}>
            <div style={{ color: C.gray, fontSize: 12 }}>TOTAL FLEET</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.gold }}>{cars.length} Vehicles</div>
          </div>
          <div style={{ background: "#1f2937", padding: 16, borderRadius: 12 }}>
            <div style={{ color: C.gray, fontSize: 12 }}>ACTIVE BOOKINGS</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.green }}>{bookings.length} Bookings</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN APP CONTROLLER
========================================================= */

function App() {
  const [cars, setCars] = useState([]);
  const [cities, setCities] = useState(seedCities);
  const [bookings, setBookings] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, ci, b] = await Promise.all([fetchCars(), fetchCities(), fetchBookings()]);
        if (c && c.length) setCars(c);
        if (ci && ci.length) setCities(ci);
        if (b && b.length) setBookings(b);
      } catch (err) {
        console.error("Initialization error", err);
      }
    })();
  }, []);

  function handleConfirmBooking(bookingData) {
    const booking = { id: uid("booking"), createdAt: new Date().toISOString(), ...bookingData };
    setBookings((prev) => [...prev, booking]);
    insertBooking(booking).catch(console.error);
  }

  if (isAdmin) {
    return <AdminView cars={cars} setCars={setCars} cities={cities} setCities={setCities} bookings={bookings} onClose={() => setIsAdmin(false)} />;
  }

  return (
    <CustomerView
      cars={cars}
      cities={cities}
      bookings={bookings}
      onBook={handleConfirmBooking}
      onOpenAdmin={() => setIsAdmin(true)}
    />
  );
}

/* =========================================================
   STYLES
========================================================= */

const labelStyle = {
  display: "block",
  color: C.navy,
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  height: 44,
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "0 12px",
  fontSize: 14,
  outline: "none",
};

const fieldGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const modalBackdrop = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(0,0,0,0.65)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalCard = {
  width: "100%",
  maxWidth: 540,
  background: "#fff",
  borderRadius: 20,
  overflow: "hidden",
  boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
};

const modalHeader = {
  padding: "16px 20px",
  borderBottom: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const iconButton = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: C.navy,
};

export default App;
