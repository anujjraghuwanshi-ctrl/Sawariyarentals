import React, { useEffect, useMemo, useState } from "react";
import {
  Car,
  MapPin,
  Calendar,
  Phone,
  User,
  Plus,
  Trash2,
  Check,
  X,
  Fuel,
  Settings2,
  LayoutDashboard,
  KeyRound,
  LogOut,
  ChevronRight,
  Clock3,
  CircleDollarSign,
  Search,
  Menu,
  ShieldCheck,
  Gauge,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

const C = {
  ink: "#14161C",
  inkSoft: "#1E212A",
  highway: "#E3A73B",
  highwayDeep: "#C88F2A",
  dusk: "#3A6B6B",
  paper: "#F2EDE1",
  rust: "#B3452D",
  steel: "#8A8F98",
  moss: "#5C7A5E",
  line: "#2B2E38",
};

const ADMIN_PASSCODE = "sawariya123";

const seedCars = [
  { id: "car-1", name: "Maruti Swift", city: "Indore", type: "Hatchback", price: 1400, fuel: "Petrol", transmission: "Manual", seats: 5, status: "available" },
  { id: "car-2", name: "Hyundai i20", city: "Indore", type: "Hatchback", price: 1600, fuel: "Petrol", transmission: "Manual", seats: 5, status: "available" },
  { id: "car-3", name: "Mahindra Thar", city: "Indore", type: "SUV", price: 3200, fuel: "Diesel", transmission: "Manual", seats: 4, status: "rented" },
  { id: "car-4", name: "Kia Seltos", city: "Ujjain", type: "SUV", price: 2800, fuel: "Petrol", transmission: "Automatic", seats: 5, status: "available" },
  { id: "car-5", name: "Toyota Innova Crysta", city: "Indore", type: "MUV", price: 3600, fuel: "Diesel", transmission: "Manual", seats: 7, status: "available" },
  { id: "car-6", name: "Renault Kwid", city: "Ujjain", type: "Hatchback", price: 1100, fuel: "Petrol", transmission: "Manual", seats: 5, status: "available" },
];

const seedCities = ["Indore", "Ujjain"];

const uid = (prefix = "id") => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (date, days) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a, b) => Math.max(1, Math.ceil((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000));

async function loadShared(key, fallback) {
  try {
    if (window.storage?.get) {
      const result = await window.storage.get(key, true);
      if (result?.value) return JSON.parse(result.value);
    }
  } catch {}
  try {
    const raw = localStorage.getItem(`sawariya:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function saveShared(key, value) {
  try {
    if (window.storage?.set) {
      await window.storage.set(key, JSON.stringify(value), true);
      return;
    }
  } catch {}
  try {
    localStorage.setItem(`sawariya:${key}`, JSON.stringify(value));
  } catch {}
}

function Badge({ children, tone = "gold" }) {
  const styles = {
    gold: { background: "#3A2D16", color: C.highway },
    green: { background: "#213126", color: "#A9D0AE" },
    red: { background: "#3A201B", color: "#F1A28F" },
    gray: { background: "#292C34", color: "#C9CBD0" },
  };
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={styles[tone]}>
      {children}
    </span>
  );
}

function CarThumb({ car }) {
  const gradients = {
    SUV: "from-[#30353F] to-[#15171C]",
    MUV: "from-[#3B3530] to-[#17191D]",
    Hatchback: "from-[#343C3C] to-[#17191D]",
  };
  return (
    <div className={`relative h-44 overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[car.type] || gradients.SUV}`}>
      <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 70% 30%, #E3A73B 0, transparent 34%)" }} />
      <div className="absolute bottom-8 left-1/2 w-[78%] -translate-x-1/2">
        <div className="relative h-14 rounded-[45%] bg-[#0D0F13] shadow-[0_14px_30px_rgba(0,0,0,.55)]">
          <div className="absolute left-[18%] top-[-22px] h-12 w-[52%] rounded-t-[70%] bg-[#20242C] border border-[#4B505B]">
            <div className="absolute left-2 top-2 h-7 w-[45%] rounded-tl-[70%] bg-[#66717B]/50" />
            <div className="absolute right-2 top-2 h-7 w-[45%] rounded-tr-[70%] bg-[#66717B]/50" />
          </div>
          <div className="absolute left-[8%] top-4 h-3 w-7 rounded-full bg-[#E3A73B]" />
          <div className="absolute right-[8%] top-4 h-3 w-7 rounded-full bg-[#B3452D]" />
          <div className="absolute -bottom-3 left-[14%] h-7 w-7 rounded-full border-4 border-[#22252B] bg-[#090A0D]" />
          <div className="absolute -bottom-3 right-[14%] h-7 w-7 rounded-full border-4 border-[#22252B] bg-[#090A0D]" />
        </div>
      </div>
      <div className="absolute bottom-3 left-4 text-[10px] font-bold tracking-[.24em] text-[#C9CBD0]">
        SAWARIYA • {car.type.toUpperCase()}
      </div>
    </div>
  );
}

function CarCard({ car, onBook, index }) {
  return (
    <article
      className="saw-card-enter saw-card-interactive overflow-hidden rounded-3xl border border-[#2B2E38] bg-[#1E212A]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <CarThumb car={car} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-display text-2xl tracking-wide text-[#F2EDE1]">{car.name}</h3>
              <Badge tone={car.status === "available" ? "green" : "red"}>
                {car.status === "available" ? "AVAILABLE" : "RENTED"}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-[#9FA4AE]">
              <MapPin size={14} /> {car.city}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl text-[#E3A73B]">{fmtINR(car.price)}</div>
            <div className="text-xs text-[#8A8F98]">per day</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-y border-[#2B2E38] py-4 text-xs text-[#B9BDC5]">
          <div className="flex items-center gap-1.5"><Fuel size={14} />{car.fuel}</div>
          <div className="flex items-center gap-1.5"><Settings2 size={14} />{car.transmission}</div>
          <div className="flex items-center gap-1.5"><User size={14} />{car.seats} seats</div>
        </div>

        <button
          disabled={car.status !== "available"}
          onClick={() => onBook(car)}
          className="saw-button mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 font-bold disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: car.status === "available" ? C.highway : C.line, color: C.ink }}
        >
          {car.status === "available" ? <>Book this car <ArrowRight size={17} /></> : "Currently rented"}
        </button>
      </div>
    </article>
  );
}

function BookingModal({ car, onClose, onConfirm }) {
  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(addDaysISO(todayISO(), 1));
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);

  const totalDays = daysBetween(startDate, endDate);
  const total = totalDays * car.price;

  
    if (step === 1 && new Date(endDate) < new Date(startDate)) return;
    if (step === 2 && (!name.trim() || phone.replace(/\D/g, "").length < 10)) return;
    setStep((s) => Math.min(3, s + 1));
  };

  const confirm = async () => {
  try {
    // Load Razorpay Checkout
    if (!window.Razorpay) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }

    // Create Razorpay order
    const orderResponse = await fetch("/api/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: total,
        receipt: `booking_${Date.now()}`,
      }),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      throw new Error(orderData.error || "Unable to create payment order");
    }

    // Open Razorpay
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "SAWARIYA RENTALS",
      description: `${car.name} Rental`,
      order_id: orderData.orderId,

      prefill: {
        name: name.trim(),
        contact: phone.trim(),
      },

      theme: {
        color: "#E3A73B",
      },

      handler: async function (response) {
        // Verify payment on server
        const verifyResponse = await fetch("/api/verify-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(response),
        });

        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok || !verifyData.verified) {
          alert("Payment verification failed. Please contact SAWARIYA RENTALS.");
          return;
        }

        // Payment verified — confirm booking
        onConfirm({
          id: uid("booking"),
          carId: car.id,
          carName: car.name,
          city: car.city,
          customer: name.trim(),
          phone: phone.trim(),
          startDate,
          endDate,
          days: totalDays,
          total,
          status: "confirmed",
          paymentStatus: "paid",
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          createdAt: new Date().toISOString(),
        });

        setDone(true);
      },
    };

    const razorpay = new window.Razorpay(options);

    razorpay.on("payment.failed", function () {
      alert("Payment failed. Please try again.");
    });

    razorpay.open();

  } catch (error) {
    console.error(error);
    alert("Unable to start payment. Please try again.");
  }
};
      <div className="saw-modal-panel-upgraded max-h-[92vh] w-full overflow-y-auto rounded-t-[30px] border border-[#383C46] bg-[#1E212A] shadow-2xl sm:max-w-xl sm:rounded-[30px]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2B2E38] bg-[#1E212A]/95 px-5 py-4 backdrop-blur">
          <div>
            <div className="text-xs font-bold tracking-[.2em] text-[#E3A73B]">SAWARIYA RENTALS</div>
            <div className="font-display text-xl text-[#F2EDE1]">{done ? "Booking confirmed" : `Book ${car.name}`}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-[#B9BDC5] hover:bg-[#2B2E38]"><X size={20} /></button>
        </div>

        {!done ? (
          <div className="p-5">
            <div className="mb-6 flex items-center gap-2">
              {[1,2,3].map((n) => (
                <React.Fragment key={n}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step >= n ? "bg-[#E3A73B] text-[#14161C]" : "bg-[#2B2E38] text-[#8A8F98]"}`}>{n}</div>
                  {n < 3 && <div className={`h-0.5 flex-1 ${step > n ? "bg-[#E3A73B]" : "bg-[#2B2E38]"}`} />}
                </React.Fragment>
              ))}
            </div>

            {step === 1 && (
              <div className="anim-fade-in">
                <h3 className="mb-1 font-display text-2xl">Choose your dates</h3>
                <p className="mb-5 text-sm text-[#8A8F98]">{car.city} • {fmtINR(car.price)}/day</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold">
                    Pickup
                    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[#3A3E48] bg-[#14161C] px-3">
                      <Calendar size={17} className="text-[#E3A73B]" />
                      <input className="w-full bg-transparent px-1 py-3 outline-none" type="date" min={todayISO()} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                  </label>
                  <label className="block text-sm font-semibold">
                    Return
                    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[#3A3E48] bg-[#14161C] px-3">
                      <Calendar size={17} className="text-[#E3A73B]" />
                      <input className="w-full bg-transparent px-1 py-3 outline-none" type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  </label>
                </div>
                <div className="mt-5 rounded-2xl bg-[#14161C] p-4 text-sm text-[#B9BDC5]">
                  {totalDays} day{totalDays > 1 ? "s" : ""} × {fmtINR(car.price)} = <strong className="text-[#F2EDE1]">{fmtINR(total)}</strong>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="anim-fade-in">
                <h3 className="mb-1 font-display text-2xl">Your details</h3>
                <p className="mb-5 text-sm text-[#8A8F98]">We'll use these details for your booking.</p>
                <label className="mb-4 block text-sm font-semibold">Full name
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[#3A3E48] bg-[#14161C] px-3">
                    <User size={17} className="text-[#E3A73B]" />
                    <input className="w-full bg-transparent px-1 py-3 outline-none" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                </label>
                <label className="block text-sm font-semibold">Phone number
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[#3A3E48] bg-[#14161C] px-3">
                    <Phone size={17} className="text-[#E3A73B]" />
                    <input className="w-full bg-transparent px-1 py-3 outline-none" inputMode="tel" placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="anim-fade-in">
                <h3 className="mb-4 font-display text-2xl">Review & confirm</h3>
                <div className="space-y-3 rounded-2xl bg-[#14161C] p-4 text-sm">
                  <div className="flex justify-between"><span className="text-[#8A8F98]">Vehicle</span><strong>{car.name}</strong></div>
                  <div className="flex justify-between"><span className="text-[#8A8F98]">City</span><strong>{car.city}</strong></div>
                  <div className="flex justify-between"><span className="text-[#8A8F98]">Dates</span><strong>{startDate} → {endDate}</strong></div>
                  <div className="flex justify-between"><span className="text-[#8A8F98]">Customer</span><strong>{name}</strong></div>
                  <div className="flex justify-between"><span className="text-[#8A8F98]">Phone</span><strong>{phone}</strong></div>
                  <div className="mt-2 border-t border-[#2B2E38] pt-3 flex justify-between text-base"><span>Total</span><strong className="text-[#E3A73B]">{fmtINR(total)}</strong></div>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              {step > 1 && <button onClick={() => setStep((s) => s - 1)} className="saw-button flex-1 rounded-2xl border border-[#3A3E48] py-3 font-bold">Back</button>}
              {step < 3 ? (
                <button onClick={next} className="saw-button flex-1 rounded-2xl py-3 font-bold" style={{ background: C.highway, color: C.ink }}>Continue</button>
              ) : (
                <button onClick={confirm} className="saw-button flex-1 rounded-2xl py-3 font-bold" style={{ background: C.highway, color: C.ink }}>Confirm booking</button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="saw-success-icon mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "#26372A" }}>
              <Check size={42} className="text-[#A9D0AE]" />
            </div>
            <h3 className="mt-5 font-display text-3xl">You're booked</h3>
            <p className="mt-2 text-[#9FA4AE]">Your {car.name} booking has been recorded.</p>
            <div className="mt-6 rounded-2xl bg-[#14161C] p-4 text-left text-sm">
              <div className="flex justify-between"><span className="text-[#8A8F98]">Booking ID</span><strong>#{String(Date.now()).slice(-6)}</strong></div>
              <div className="mt-2 flex justify-between"><span className="text-[#8A8F98]">Total</span><strong className="text-[#E3A73B]">{fmtINR(total)}</strong></div>
            </div>
            <button onClick={onClose} className="saw-button mt-6 w-full rounded-2xl py-3 font-bold" style={{ background: C.highway, color: C.ink }}>Done</button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function CustomerView({ cars, cities, onBook }) {
  const [city, setCity] = useState("All");
  const [type, setType] = useState("All");
  const [query, setQuery] = useState("");

  const types = useMemo(() => ["All", ...Array.from(new Set(cars.map((c) => c.type)))], [cars]);
  const filtered = useMemo(() => cars.filter((car) =>
    (city === "All" || car.city === city) &&
    (type === "All" || car.type === type) &&
    car.name.toLowerCase().includes(query.toLowerCase())
  ), [cars, city, type, query]);

  return (
    <main className="saw-page-enter">
      <section className="relative overflow-hidden border-b border-[#2B2E38]">
        <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 80% 20%, rgba(227,167,59,.18), transparent 30%), radial-gradient(circle at 20% 70%, rgba(58,107,107,.16), transparent 35%)" }} />
        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#4B3A20] bg-[#2B2111] px-3 py-1.5 text-xs font-bold tracking-[.18em] text-[#E3A73B]">
              <span className="saw-live-dot h-2 w-2 rounded-full bg-[#E3A73B]" /> 24×7 RENTALS
            </div>
            <h1 className="font-display text-5xl leading-none tracking-wide text-[#F2EDE1] sm:text-7xl">SELF DRIVE.<br /><span className="text-[#E3A73B]">YOUR WAY.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#A9ADB6] sm:text-lg">Book cars in your city with SAWARIYA RENTALS. Simple booking, transparent daily rates, and a fleet built for the road.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="grid gap-3 rounded-3xl border border-[#2B2E38] bg-[#1E212A] p-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="flex items-center gap-2 rounded-2xl bg-[#14161C] px-3">
            <Search size={18} className="text-[#8A8F98]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a car" className="w-full bg-transparent py-3 outline-none" />
          </div>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-2xl bg-[#14161C] px-4 py-3 text-[#F2EDE1] outline-none">
            <option>All</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-2xl bg-[#14161C] px-4 py-3 text-[#F2EDE1] outline-none">
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
          <button onClick={() => { setCity("All"); setType("All"); setQuery(""); }} className="saw-button flex items-center justify-center gap-2 rounded-2xl border border-[#3A3E48] px-4 py-3 font-semibold"><RotateCcw size={16} /> Reset</button>
        </div>

        <div className="mb-5 mt-8 flex items-end justify-between">
          <div>
            <div className="text-xs font-bold tracking-[.2em] text-[#E3A73B]">FLEET</div>
            <h2 className="font-display text-3xl">Available rides</h2>
          </div>
          <div className="text-sm text-[#8A8F98]">{filtered.length} vehicle{filtered.length !== 1 ? "s" : ""}</div>
        </div>

        {filtered.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((car, i) => <CarCard key={car.id} car={car} onBook={onBook} index={i} />)}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#3A3E48] p-12 text-center text-[#8A8F98]">No vehicles match your search.</div>
        )}
      </section>
    </main>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="saw-stat-card rounded-3xl border border-[#2B2E38] bg-[#1E212A] p-5">
      <div className="flex items-center justify-between">
        <div className="rounded-2xl bg-[#14161C] p-3 text-[#E3A73B]"><Icon size={20} /></div>
        <div className="font-display text-3xl">{value}</div>
      </div>
      <div className="mt-4 text-sm text-[#8A8F98]">{label}</div>
    </div>
  );
}

function AdminView({ cars, setCars, bookings, setBookings, cities, setCities, onLogout }) {
  const [tab, setTab] = useState("fleet");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", city: cities[0] || "", type: "Hatchback", price: "", fuel: "Petrol", transmission: "Manual", seats: 5 });
  const available = cars.filter((c) => c.status === "available").length;
  const rented = cars.filter((c) => c.status === "rented").length;

  const addVehicle = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price || !form.city) return;
    setCars((prev) => [...prev, { ...form, id: uid("car"), price: Number(form.price), seats: Number(form.seats), status: "available" }]);
    setShowAdd(false);
    setForm({ name: "", city: cities[0] || "", type: "Hatchback", price: "", fuel: "Petrol", transmission: "Manual", seats: 5 });
  };

  const removeCar = (id) => setCars((prev) => prev.filter((c) => c.id !== id));
  const toggleStatus = (id) => setCars((prev) => prev.map((c) => c.id === id ? { ...c, status: c.status === "available" ? "rented" : "available" } : c));
  const bookingStatus = (id, status) => setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));

  return (
    <main className="saw-page-enter mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-bold tracking-[.2em] text-[#E3A73B]">ADMIN CONSOLE</div>
          <h1 className="font-display text-4xl">Fleet control</h1>
          <p className="mt-1 text-[#8A8F98]">Manage vehicles, bookings and operating cities.</p>
        </div>
        <button onClick={onLogout} className="saw-button flex items-center justify-center gap-2 rounded-2xl border border-[#3A3E48] px-4 py-3 font-semibold"><LogOut size={17} /> Exit admin</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Car} label="Total vehicles" value={cars.length} />
        <StatCard icon={ShieldCheck} label="Available now" value={available} />
        <StatCard icon={Clock3} label="Currently rented" value={rented} />
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto rounded-2xl bg-[#1E212A] p-2">
        {[
          ["fleet", "Fleet"],
          ["bookings", "Bookings"],
          ["cities", "Cities"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === key ? "bg-[#E3A73B] text-[#14161C]" : "text-[#9FA4AE]"}`}>{label}</button>
        ))}
      </div>

      {tab === "fleet" && (
        <section className="mt-5 overflow-hidden rounded-3xl border border-[#2B2E38] bg-[#1E212A]">
          <div className="flex items-center justify-between border-b border-[#2B2E38] p-5">
            <h2 className="font-display text-2xl">Vehicles</h2>
            <button onClick={() => setShowAdd(true)} className="saw-button flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold" style={{ background: C.highway, color: C.ink }}><Plus size={17} /> Add vehicle</button>
          </div>
          <div className="divide-y divide-[#2B2E38]">
            {cars.map((car) => (
              <div key={car.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-[#14161C] p-3"><Car size={20} className="text-[#E3A73B]" /></div>
                  <div>
                    <div className="font-bold">{car.name}</div>
                    <div className="text-sm text-[#8A8F98]">{car.city} • {car.type} • {fmtINR(car.price)}/day</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleStatus(car.id)} className="saw-button"><Badge tone={car.status === "available" ? "green" : "red"}>{car.status}</Badge></button>
                  <button onClick={() => removeCar(car.id)} className="rounded-xl border border-[#3A3E48] p-2.5 text-[#B3452D] hover:bg-[#2B2E38]"><Trash2 size={17} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "bookings" && (
        <section className="mt-5 overflow-hidden rounded-3xl border border-[#2B2E38] bg-[#1E212A]">
          <div className="border-b border-[#2B2E38] p-5"><h2 className="font-display text-2xl">Bookings</h2></div>
          {bookings.length ? (
            <div className="divide-y divide-[#2B2E38]">
              {bookings.slice().reverse().map((b) => (
                <div key={b.id} className="p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <div className="font-bold">{b.carName} • {b.customer}</div>
                      <div className="mt-1 text-sm text-[#8A8F98]">{b.city} • {b.startDate} → {b.endDate} • {b.phone}</div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="font-display text-xl text-[#E3A73B]">{fmtINR(b.total)}</div>
                      <select value={b.status} onChange={(e) => bookingStatus(b.id, e.target.value)} className="mt-1 rounded-lg bg-[#14161C] px-2 py-1 text-xs">
                        <option value="confirmed">confirmed</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="p-10 text-center text-[#8A8F98]">No bookings yet.</div>}
        </section>
      )}

      {tab === "cities" && (
        <section className="mt-5 rounded-3xl border border-[#2B2E38] bg-[#1E212A] p-5">
          <h2 className="font-display text-2xl">Cities</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {cities.map((city) => (
              <div key={city} className="flex items-center gap-2 rounded-full border border-[#3A3E48] bg-[#14161C] px-3 py-2">
                <MapPin size={14} className="text-[#E3A73B]" /> {city}
                <button onClick={() => setCities((prev) => prev.filter((c) => c !== city))} className="text-[#8A8F98] hover:text-[#B3452D]"><X size={14} /></button>
              </div>
            ))}
          </div>
          <form className="mt-5 flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            const value = e.currentTarget.city.value.trim();
            if (value && !cities.includes(value)) setCities((prev) => [...prev, value]);
            e.currentTarget.reset();
          }}>
            <input name="city" placeholder="Add city" className="min-w-0 flex-1 rounded-2xl border border-[#3A3E48] bg-[#14161C] px-4 py-3 outline-none" />
            <button className="saw-button rounded-2xl px-4 font-bold" style={{ background: C.highway, color: C.ink }}>Add</button>
          </form>
        </section>
      )}

      {showAdd && (
        <div className="anim-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
          <form onSubmit={addVehicle} className="saw-modal-panel-upgraded w-full max-w-lg rounded-3xl border border-[#3A3E48] bg-[#1E212A] p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><h2 className="font-display text-2xl">Add vehicle</h2><button type="button" onClick={() => setShowAdd(false)}><X /></button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input required placeholder="Vehicle name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="rounded-2xl bg-[#14161C] px-4 py-3 outline-none sm:col-span-2" />
              <select value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} className="rounded-2xl bg-[#14161C] px-4 py-3 outline-none">{cities.map((c) => <option key={c}>{c}</option>)}</select>
              <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="rounded-2xl bg-[#14161C] px-4 py-3 outline-none"><option>Hatchback</option><option>SUV</option><option>MUV</option><option>Sedan</option></select>
              <input required type="number" min="1" placeholder="Price / day" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="rounded-2xl bg-[#14161C] px-4 py-3 outline-none" />
              <select value={form.fuel} onChange={(e) => setForm({...form, fuel: e.target.value})} className="rounded-2xl bg-[#14161C] px-4 py-3 outline-none"><option>Petrol</option><option>Diesel</option><option>CNG</option><option>Electric</option></select>
              <select value={form.transmission} onChange={(e) => setForm({...form, transmission: e.target.value})} className="rounded-2xl bg-[#14161C] px-4 py-3 outline-none"><option>Manual</option><option>Automatic</option></select>
              <input type="number" min="1" max="12" value={form.seats} onChange={(e) => setForm({...form, seats: e.target.value})} className="rounded-2xl bg-[#14161C] px-4 py-3 outline-none" />
            </div>
            <button className="saw-button mt-5 w-full rounded-2xl py-3 font-bold" style={{ background: C.highway, color: C.ink }}>Add to fleet</button>
          </form>
        </div>
      )}
    </main>
  );
}

function AdminGate({ onSuccess, onCancel }) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (pass === ADMIN_PASSCODE) onSuccess();
    else setError(true);
  };
  return (
    <div className="anim-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
      <form onSubmit={submit} className="saw-modal-panel-upgraded w-full max-w-sm rounded-3xl border border-[#3A3E48] bg-[#1E212A] p-6 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#14161C] text-[#E3A73B]"><KeyRound /></div>
        <h2 className="mt-5 text-center font-display text-2xl">Admin access</h2>
        <p className="mt-1 text-center text-sm text-[#8A8F98]">Enter the admin passcode.</p>
        <input autoFocus type="password" value={pass} onChange={(e) => { setPass(e.target.value); setError(false); }} className="mt-5 w-full rounded-2xl border border-[#3A3E48] bg-[#14161C] px-4 py-3 text-center outline-none" placeholder="Passcode" />
        {error && <div className="mt-2 text-center text-sm text-[#F1A28F]">Incorrect passcode.</div>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="saw-button rounded-2xl border border-[#3A3E48] py-3 font-bold">Cancel</button>
          <button className="saw-button rounded-2xl py-3 font-bold" style={{ background: C.highway, color: C.ink }}>Enter</button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [cars, setCars] = useState(seedCars);
  const [cities, setCities] = useState(seedCities);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [gate, setGate] = useState(false);
  const [bookingCar, setBookingCar] = useState(null);

  useEffect(() => {
    (async () => {
      const [storedCars, storedCities, storedBookings] = await Promise.all([
        loadShared("cars", seedCars),
        loadShared("cities", seedCities),
        loadShared("bookings", []),
      ]);
      setCars(storedCars);
      setCities(storedCities);
      setBookings(storedBookings);
      setLoading(false);
    })();
  }, []);

  useEffect(() => { if (!loading) saveShared("cars", cars); }, [cars, loading]);
  useEffect(() => { if (!loading) saveShared("cities", cities); }, [cities, loading]);
  useEffect(() => { if (!loading) saveShared("bookings", bookings); }, [bookings, loading]);

  const confirmBooking = (booking) => {
    setBookings((prev) => [...prev, booking]);
    setCars((prev) => prev.map((c) => c.id === booking.carId ? { ...c, status: "rented" } : c));
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#14161C] text-[#E3A73B]"><div className="saw-live-dot font-display text-2xl tracking-widest">SAWARIYA</div></div>;
  }

  return (
    <div className="min-h-screen bg-[#14161C] text-[#F2EDE1]">
      <header className="sticky top-0 z-40 border-b border-[#2B2E38] bg-[#14161C]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <button onClick={() => setAdmin(false)} className="flex items-center gap-3 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3A73B] text-[#14161C]"><Car size={22} /></div>
            <div>
              <div className="font-display text-xl tracking-wide">SAWARIYA RENTALS</div>
              <div className="text-[10px] tracking-[.18em] text-[#8A8F98]">SELF DRIVE • YOUR WAY</div>
            </div>
          </button>
          <button onClick={() => admin ? setAdmin(false) : setGate(true)} className="saw-button flex items-center gap-2 rounded-xl border border-[#3A3E48] px-3 py-2 text-sm font-semibold">
            {admin ? <><LayoutDashboard size={16} /> Customer</> : <><KeyRound size={16} /> Admin</>}
          </button>
        </div>
      </header>

      {admin ? (
        <AdminView cars={cars} setCars={setCars} bookings={bookings} setBookings={setBookings} cities={cities} setCities={setCities} onLogout={() => setAdmin(false)} />
      ) : (
        <CustomerView cars={cars} cities={cities} onBook={setBookingCar} />
      )}

      <footer className="border-t border-[#2B2E38]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-[#8A8F98] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div><span className="font-display text-[#F2EDE1]">SAWARIYA RENTALS</span> • 24×7 rental service</div>
          <div className="flex items-center gap-4"><span>Cars</span><span>Bike</span><span>Scooty</span><span>Support</span></div>
        </div>
      </footer>

      {bookingCar && <BookingModal car={bookingCar} onClose={() => setBookingCar(null)} onConfirm={confirmBooking} />}
      {gate && <AdminGate onSuccess={() => { setGate(false); setAdmin(true); }} onCancel={() => setGate(false)} />}
    </div>
  );
}
