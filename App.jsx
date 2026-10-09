import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  ChevronDown,
  Fuel,
  Users,
  Home,
  Wrench,
  Headphones,
  Menu,
  Gauge,
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
   CONFIG
========================================================= */

const C = {
  navy: "#0f172a",
  blue: "#2563eb",
  blueDark: "#1d4ed8",
  sky: "#eff6ff",
  green: "#16a34a",
  greenLight: "#f0fdf4",
  red: "#dc2626",
  redLight: "#fef2f2",
  orange: "#ea580c",
  orangeLight: "#fff7ed",
  yellow: "#ca8a04",
  yellowLight: "#fefce8",
  gray: "#64748b",
  grayLight: "#f8fafc",
  border: "#e2e8f0",
  white: "#ffffff",
  black: "#020617",
};

const ADMIN_PASSCODE = "7224";
const BOOKING_ADVANCE = 500;

/* =========================================================
   RENTAL DURATIONS
========================================================= */

const RENTAL_DURATIONS = [8, 12, 24];

/* =========================================================
   INITIAL DATA
   NO CARS ARE HARDCODED
========================================================= */

const seedCars = [];

const seedCities = [
  { id: "city-indore", name: "Indore", active: true },
  { id: "city-bhopal", name: "Bhopal", active: true },
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

const DEFAULT_TRAVEL_PACKAGES = [
  { id: "ujjain", name: "Ujjain", days: 1, description: "Mahakaleshwar, Mahakal Lok and Ujjain highlights.", selfDrivePrice: 0, driverPrice: 0, guidePrice: 0 },
  { id: "omkareshwar", name: "Omkareshwar", days: 1, description: "Jyotirlinga and Narmada visit.", selfDrivePrice: 0, driverPrice: 0, guidePrice: 0 },
  { id: "mandu", name: "Mandu", days: 1, description: "Historic forts, Jahaz Mahal and heritage sites.", selfDrivePrice: 0, driverPrice: 0, guidePrice: 0 },
  { id: "maheshwar", name: "Maheshwar", days: 1, description: "Narmada ghats and Ahilya Fort.", selfDrivePrice: 0, driverPrice: 0, guidePrice: 0 },
  { id: "indore-city", name: "Indore City Tour", days: 1, description: "Rajwada, Sarafa, Chappan Dukan and more.", selfDrivePrice: 0, driverPrice: 0, guidePrice: 0 },
  { id: "pachmarhi", name: "Pachmarhi", days: 2, description: "Flexible weekend getaway with optional driver and guide.", selfDrivePrice: 0, driverPrice: 0, guidePrice: 0 },
];

const DEFAULT_DECORATIONS = [
  { id: "birthday", name: "Birthday", description: "Balloons, ribbons and custom birthday message.", price: 0 },
  { id: "wedding", name: "Wedding", description: "Wedding-ready decoration with a customizable theme.", price: 0 },
  { id: "anniversary", name: "Anniversary", description: "Flowers, ribbons and custom message.", price: 0 },
  { id: "proposal", name: "Proposal", description: "Custom romantic decoration for a special moment.", price: 0 },
  { id: "custom", name: "Custom", description: "Tell us your theme, colours and message.", price: 0 },
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

function calculateRouteEstimate(from, to) {
  if (!from || !to || from === to || !CITY_COORDS[from] || !CITY_COORDS[to]) return null;
  const [lat1, lon1] = CITY_COORDS[from];
  const [lat2, lon2] = CITY_COORDS[to];
  const R = 6371;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const straight = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.max(1, Math.round(straight * 1.18));
  const hours = Math.max(0.5, Math.round((distanceKm / 45) * 10) / 10);
  return { distanceKm, hours };
}

function fuelCostPerKm(fuel, settings) {
  const f = String(fuel || "").toLowerCase();
  if (f.includes("cng")) return Number(settings.cngCostPerKm || 4.5);
  if (f.includes("diesel")) return Number(settings.dieselCostPerKm || 9.25);
  return Number(settings.petrolCostPerKm || 7.5);
}

/* =========================================================
   HELPERS
========================================================= */

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
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

function daysBetween(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
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

/* =========================================================
   REMOVE OLD HARDCODED CARS
========================================================= */

function loadCars() {
  const cars = loadShared("sawariya_cars", seedCars);

  if (!Array.isArray(cars)) {
    return [];
  }

  // Remove the old four hard-coded demo vehicles
  // from previous versions of the app.
  const oldDemoIds = [
    "car-1",
    "car-2",
    "car-3",
    "car-4",
  ];

  return cars.filter(
    (car) => !oldDemoIds.includes(car.id)
  );
}

/* =========================================================
   IMAGE COMPRESSION
========================================================= */

function compressImage(
  file,
  maxWidth = 1200,
  quality = 0.75
) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round(
            (height * maxWidth) / width
          );

          width = maxWidth;
        }

        const canvas =
          document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        resolve(
          canvas.toDataURL(
            "image/jpeg",
            quality
          )
        );
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

/* =========================================================
   UI COMPONENTS
========================================================= */

function Badge({
  children,
  color = C.blue,
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 9px",
        borderRadius: 999,
        background: `${color}12`,
        color,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function CarThumb({
  car,
  size = 150,
}) {
  const photo = car?.photos?.[0];

  return (
    <div
      style={{
        width: size,
        height: size * 0.68,
        borderRadius: 16,
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #e0f2fe 0%, #f8fafc 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {photo ? (
        <img
          src={photo}
          alt={car.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <Car
          size={48}
          color={C.blue}
          strokeWidth={1.5}
        />
      )}
    </div>
  );
}

/* =========================================================
   CAR CARD
========================================================= */
const STARS = (n) => "★★★★★☆☆☆☆☆".slice(5 - n, 10 - n);

const PAGE_REVIEWS = [
  { n: "Rahul S.", p: "Vijay Nagar", t: "Thar clean thi, koi extra nahi.", s: 5 },
  { n: "Neha M.", p: "Palasia", t: "Baleno CNG family ke liye perfect.", s: 5 },
  { n: "Amit K.", p: "Scheme 54", t: "Scorpio time pe mili.", s: 5 },
  { n: "Priya J.", p: "Sapna Sangeeta", t: "Rate theek, booking easy.", s: 5 },
  { n: "Vikas T.", p: "Bhawarkua", t: "Fronx AC tight thi.", s: 4 },
  { n: "Sana R.", p: "New Palasia", t: "Curvv drive soft.", s: 5 },
  { n: "Mohit P.", p: "Sudama Nagar", t: "8 hour package clear.", s: 4 },
  { n: "Anjali D.", p: "AB Road", t: "Call pe jaldi reply.", s: 5 },
  { n: "Farhan A.", p: "Khajrana", t: "Papers theek the.", s: 5 },
  { n: "Kavita S.", p: "Rajendra Nagar", t: "Gaadi washed thi.", s: 5 },
  { n: "Rohit B.", p: "Ring Road", t: "Thar weekend pe mil gayi.", s: 4 },
  { n: "Isha G.", p: "Vijay Nagar", t: "Pickup easy.", s: 5 },
  { n: "Suresh L.", p: "MR 10", t: "24 hour rate fair.", s: 4 },
  { n: "Pooja N.", p: "Bengali Square", t: "Baleno chhoti family ke liye.", s: 5 },
  { n: "Aditya V.", p: "Scheme 78", t: "WhatsApp pe photo bheji.", s: 5 },
  { n: "Meena K.", p: "Indore", t: "Second time book kiya.", s: 5 },
  { n: "Harsh P.", p: "Airport Road", t: "Airport drop time pe.", s: 4 },
  { n: "Nidhi C.", p: "Tulsi Nagar", t: "Deposit same day wapas.", s: 5 },
  { n: "Yash W.", p: "Bhanwarkuan", t: "Scorpio seating achha.", s: 5 },
  { n: "Ritu A.", p: "Old Palasia", t: "Clean interior.", s: 5 },
  { n: "Kunal J.", p: "Vijay Nagar", t: "Multi day allowed.", s: 4 },
  { n: "Shreya M.", p: "Nipania", t: "Fronx mileage achha.", s: 5 },
  { n: "Imran S.", p: "Khajrana", t: "Documents fast.", s: 5 },
  { n: "Tanvi R.", p: "Scheme 54", t: "Photos same thi.", s: 5 },
  { n: "Gaurav D.", p: "Rajwada", t: "Local trip perfect.", s: 4 },
  { n: "Payal B.", p: "Silicon City", t: "Call jaldi uthaya.", s: 5 },
  { n: "Nikhil T.", p: "Vijay Nagar", t: "Jo Thar maangi wahi mili.", s: 5 },
  { n: "Ayesha K.", p: "Palasia", t: "Staff helpful.", s: 5 },
  { n: "Devansh P.", p: "MR 10", t: "Night pickup mil gaya.", s: 4 },
  { n: "Smita G.", p: "Sudama Nagar", t: "Jo rate kaha wahi liya.", s: 5 },
  { n: "Arjun S.", p: "Bicholi", t: "Curvv boot space kaam aaya.", s: 5 },
  { n: "Rashmi L.", p: "Annapurna", t: "Family ke liye Scorpio.", s: 5 },
  { n: "Pankaj M.", p: "Indore", t: "Second car on time.", s: 4 },
  { n: "Jaya V.", p: "Scheme 136", t: "Form short hai.", s: 5 },
  { n: "Siddharth R.", p: "Vijay Nagar", t: "Rules clear bataye.", s: 5 },
  { n: "Komal N.", p: "Palasia", t: "AC cold tha.", s: 5 },
  { n: "Abhishek C.", p: "Ring Road", t: "Extend kar diya easily.", s: 4 },
  { n: "Divya P.", p: "New Palasia", t: "Photo zoom karke book ki.", s: 5 },
  { n: "Manish K.", p: "Bhawarkua", t: "Deposit pehle bataya.", s: 5 },
  { n: "Sneha T.", p: "Scheme 54", t: "Seats clean.", s: 5 },
  { n: "Rajat G.", p: "Indore", t: "Location pin mil gaya.", s: 5 },
  { n: "Alok J.", p: "Vijay Nagar", t: "Phir se yahi se lunga.", s: 5 },
];

function CarCard({ car, onBook }) {
  const photos = car.photos || [];
  const photo = photos[0] || null;
  const price =
    Number(car.price24 || car.dailyRate || car.price12 || car.price8 || car.price || 0);

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 6px 20px rgba(15,23,42,.06)",
        minHeight: 118,
      }}
    >
      <div
        style={{
          width: 120,
          minWidth: 120,
          background: "linear-gradient(135deg,#dbeafe,#f8fafc)",
          position: "relative",
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt={car.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Car size={36} color={C.blue} strokeWidth={1.3} />
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          padding: "10px 12px 10px 0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minWidth: 0,
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 900,
                color: C.navy,
                lineHeight: 1.25,
              }}
            >
              {car.name}
            </h3>
            <Badge color={car.available ? C.green : C.red}>
              {car.available ? "Available" : "Rented"}
            </Badge>
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: C.gray }}>
            {car.type} · {car.fuel} · {car.transmission || "Manual"} · {car.seats} seats
          </div>
          <div style={{ marginTop: 3, fontSize: 12, color: C.gray }}>
            {car.city}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginTop: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: C.gray, fontWeight: 700 }}>FROM</div>
            <strong style={{ color: C.blue, fontSize: 18 }}>{fmtINR(price)}</strong>
            <span style={{ fontSize: 11, color: C.gray }}> /day</span>
          </div>
          <button
            type="button"
            disabled={!car.available}
            onClick={() => onBook(car)}
            style={{
              ...primaryButton,
              minHeight: 36,
              padding: "0 14px",
              fontSize: 13,
              borderRadius: 10,
              opacity: car.available ? 1 : 0.5,
              whiteSpace: "nowrap",
            }}
          >
            Book
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   BOOKING MODAL
========================================================= */

function BookingModal({ car, onClose, onConfirm }) {
  const settings = loadShared("sawariya_business_settings", DEFAULT_BUSINESS_SETTINGS);
  const minDate = todayISO();
  const [plan, setPlan] = useState("hourly");
  const [tripType, setTripType] = useState("round");
  const [serviceType, setServiceType] = useState("self");
  const [fuelOption, setFuelOption] = useState("customer");
  const [homeDelivery, setHomeDelivery] = useState(false);
  const [pickupCity, setPickupCity] = useState(car?.city || "Indore");
  const [dropCity, setDropCity] = useState("");
  const [pickupDate, setPickupDate] = useState(minDate);
  const [pickupTime, setPickupTime] = useState("09:00");
  const [hours, setHours] = useState(1);
  const [days, setDays] = useState(1);
  const [months, setMonths] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentType, setPaymentType] = useState("advance");
  const [loading, setLoading] = useState(false);
  const [leadSaved, setLeadSaved] = useState(false);

  useEffect(() => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length !== 10 || leadSaved) return;
    const timer = setTimeout(() => {
      insertLead({
        name: name.trim() || "Website lead",
        phone: clean,
        city: pickupCity,
        carName: car.name,
        message: "Auto-saved from booking form",
      }).then(() => setLeadSaved(true)).catch(() => {});
    }, 900);
    return () => clearTimeout(timer);
  }, [phone, name, pickupCity, car.name, leadSaved]);

  const route = useMemo(() => calculateRouteEstimate(pickupCity, dropCity), [pickupCity, dropCity]);
  const hourlyRate = Number(car.hourlyRate ?? car.price8 ?? settings.hourlyStartingPrice);
  const dailyRate = Number(car.dailyRate ?? car.price24 ?? settings.dailyStartingPrice);
  const weeklyRate = Number(car.weeklyRate ?? settings.weeklyStartingPrice);
  const monthlyRate = Number(car.monthlyRate ?? settings.monthlyStartingPrice);
  const longTermRate = Number(car.longTermRate ?? settings.longTermMonthlyPrice);
  const hourlyKm = Number(car.hourlyKm ?? settings.hourlyIncludedKm);
  const dailyKm = Number(car.dailyKm ?? settings.dailyIncludedKm);
  const extraKmRate = Number(car.extraKmRate ?? settings.extraKmRate);
  const driverDayCost = Number(car.driverCost ?? settings.driverCostPerDay);
  const fuelRate = Number(car.fuelCostPerKm ?? fuelCostPerKm(car.fuel, settings));

  let rental = 0;
  let includedKm = 0;
  if (plan === "hourly") {
    const h = Math.max(1, Math.min(24, Number(hours) || 1));
    rental = h >= 24 ? dailyRate : hourlyRate * h;
    includedKm = h >= 24 ? dailyKm : hourlyKm * h;
  } else if (plan === "daily") {
    const d = Math.max(1, Number(days) || 1);
    rental = dailyRate * d;
    includedKm = dailyKm * d;
  } else if (plan === "weekly") {
    const d = Math.max(7, Number(days) || 7);
    const weeks = Math.floor(d / 7);
    const extraDays = d % 7;
    rental = weeklyRate * weeks + dailyRate * extraDays;
    includedKm = dailyKm * d;
  } else if (plan === "monthly") {
    const m = Math.max(1, Math.min(24, Number(months) || 1));
    rental = m === 1 ? monthlyRate : monthlyRate * m;
    includedKm = dailyKm * 30 * m;
  } else {
    const m = Math.max(2, Math.min(24, Number(months) || 24));
    rental = longTermRate * m;
    includedKm = dailyKm * 30 * m;
  }

  const tripKm = route ? route.distanceKm : 0;
  const billableTripKm = tripType === "oneway" ? tripKm : 0;
  const extraKm = Math.max(0, billableTripKm - includedKm);
  const extraKmCost = extraKm * extraKmRate;
  const customerFuelCost = fuelOption === "business" ? billableTripKm * fuelRate : 0;
  const serviceDays = Math.max(1, Math.ceil((route?.hours || 8) / 8));
  const driverCost = serviceType === "self" ? 0 : driverDayCost * serviceDays;
  const guideCost = serviceType === "guide" ? Number(settings.guideCostPerDay || 800) * serviceDays : 0;
  const recoveryFuel = tripType === "oneway" ? tripKm * fuelRate : 0;
  const recoveryTime = tripType === "oneway" ? Number(settings.returnTimeCostPerHour || 250) * Math.max(1, Math.ceil(route?.hours || 1)) : 0;
  const deliveryCost = homeDelivery ? Number(settings.deliveryFlatCharge || 0) : 0;
  const subtotal = rental + extraKmCost + customerFuelCost + driverCost + guideCost + recoveryFuel + recoveryTime + deliveryCost;
  const margin = subtotal * (Number(settings.marginPercent || 10) / 100);
  const total = Math.max(0, Math.round(subtotal + margin));
  const advance = Math.min(Number(settings.bookingAdvance || BOOKING_ADVANCE), total);
  const paymentAmount = paymentType === "advance" ? advance : total;
  const remainingAmount = Math.max(0, total - paymentAmount);

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    const customerEmail = email.trim().toLowerCase();
    if (!name.trim()) return alert("Please enter your name.");
    if (!/^\d{10}$/.test(cleanPhone)) return alert("Please enter a valid 10-digit mobile number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) return alert("Please enter a valid email address.");
    if (tripType === "oneway" && !dropCity) return alert("Please select your destination.");
    if (total <= 0) return alert("Unable to calculate this booking.");

    setLoading(true);
    try {
      const pendingBooking = {
        carId: car.id,
        carName: car.name,
        city: pickupCity,
        name: name.trim(),
        phone: cleanPhone,
        email: customerEmail,
        pickupDate,
        pickupTime,
        plan,
        tripType,
        serviceType,
        fuelOption,
        dropCity,
        estimatedDistanceKm: tripKm,
        estimatedDriveHours: route?.hours || null,
        rental,
        extraKmCost,
        fuelCost: customerFuelCost,
        driverCost,
        guideCost,
        recoveryFuel,
        recoveryTime,
        deliveryCost,
        margin,
        total,
        paidAmount: paymentAmount,
        advancePaid: paymentType === "advance" ? paymentAmount : 0,
        remainingAmount,
        paymentType,
        status: "Pending",
      };
      localStorage.setItem("sawariya_pending_booking", JSON.stringify(pendingBooking));

      const paymentResponse = await fetch("/api/payu-create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          productinfo: `${paymentType === "advance" ? "Booking Advance" : "Full Payment"} - ${car.name}`,
          firstname: name.trim(),
          email: customerEmail,
          phone: cleanPhone,
          reference: `${car.id}-${Date.now()}`,
        }),
      });
      const paymentData = await paymentResponse.json().catch(() => ({}));
      if (!paymentResponse.ok || !paymentData?.success || !paymentData?.paymentUrl || !paymentData?.formData) {
        throw new Error(paymentData?.message || "PayU payment could not be created.");
      }
      const form = document.createElement("form");
      form.method = "POST";
      form.action = paymentData.paymentUrl;
      form.style.display = "none";
      Object.entries(paymentData.formData).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value ?? "";
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error("Payment start error:", error);
      localStorage.removeItem("sawariya_pending_booking");
      alert(error?.message || "Something went wrong while starting payment.");
      setLoading(false);
    }
  }

  const planButton = (value, title, text) => (
    <button type="button" onClick={() => setPlan(value)} style={{ ...choiceButton, borderColor: plan === value ? C.blue : C.border, background: plan === value ? C.sky : C.white }}>
      <strong>{title}</strong><span>{text}</span>
    </button>
  );

  return (
    <div style={modalBackdrop}>
      <form onSubmit={handleSubmit} style={{ ...modalCard, maxWidth: 820 }}>
        <div style={modalHeader}>
          <div><Badge color={C.blue}>Booking</Badge><h2 style={{ margin: "8px 0 0" }}>{car.name}</h2><p style={{ margin: "4px 0 0", color: C.gray }}>{car.city} · Minimum age 18 · Security deposit depends on vehicle</p></div>
          <button type="button" onClick={onClose} style={iconButton}><X size={19} /></button>
        </div>
        <div style={{ padding: 18, display: "grid", gap: 16 }}>
          <div><div style={labelStyle}>Rental plan</div><div style={choiceGrid}>{planButton("hourly", "Hourly", "From ₹83/hr · 20 km/hr")}{planButton("daily", "Daily", "From ₹2,200/day · 280 km/day")}{planButton("weekly", "Weekly", "From ₹8,500/week")}{planButton("monthly", "Monthly", "₹40,000 for one month")}{planButton("longterm", "2-year offer", "₹18,000/month · 24 months")}</div></div>
          <div><div style={labelStyle}>Trip type</div><div style={choiceGrid}><button type="button" onClick={() => setTripType("round")} style={{ ...choiceButton, borderColor: tripType === "round" ? C.blue : C.border, background: tripType === "round" ? C.sky : C.white }}><strong>Round trip</strong><span>Return the vehicle</span></button><button type="button" onClick={() => setTripType("oneway")} style={{ ...choiceButton, borderColor: tripType === "oneway" ? C.blue : C.border, background: tripType === "oneway" ? C.sky : C.white }}><strong>One-way</strong><span>Recovery is calculated automatically</span></button></div></div>
          <div><div style={labelStyle}>Service</div><div style={choiceGrid}><button type="button" onClick={() => setServiceType("self")} style={{ ...choiceButton, borderColor: serviceType === "self" ? C.blue : C.border, background: serviceType === "self" ? C.sky : C.white }}><strong>Self drive</strong><span>You drive</span></button><button type="button" onClick={() => setServiceType("driver")} style={{ ...choiceButton, borderColor: serviceType === "driver" ? C.blue : C.border, background: serviceType === "driver" ? C.sky : C.white }}><strong>With driver</strong><span>₹{driverDayCost.toLocaleString("en-IN")}/day approx.</span></button><button type="button" onClick={() => setServiceType("guide")} style={{ ...choiceButton, borderColor: serviceType === "guide" ? C.blue : C.border, background: serviceType === "guide" ? C.sky : C.white }}><strong>Driver + guide</strong><span>For tours</span></button></div></div>
          <div style={fieldGrid}>
            <Field label="Pickup city"><select value={pickupCity} onChange={e => setPickupCity(e.target.value)} style={inputStyle}><option>Indore</option><option>Bhopal</option></select></Field>
            {tripType === "oneway" && <Field label="Destination"><select value={dropCity} onChange={e => setDropCity(e.target.value)} style={inputStyle}><option value="">Select destination</option>{Object.keys(CITY_COORDS).filter(x => x !== pickupCity).map(x => <option key={x}>{x}</option>)}</select></Field>}
            <Field label="Pickup date"><input type="date" min={minDate} value={pickupDate} onChange={e => setPickupDate(e.target.value)} style={inputStyle} /></Field>
            <Field label="Pickup time"><input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} style={inputStyle} /></Field>
          </div>
          {plan === "hourly" && <Field label="Hours"><input type="number" min="1" max="24" value={hours} onChange={e => setHours(e.target.value)} style={inputStyle} /></Field>}
          {(plan === "daily" || plan === "weekly") && <Field label="Rental days"><input type="number" min={plan === "weekly" ? 7 : 1} value={days} onChange={e => setDays(e.target.value)} style={inputStyle} /></Field>}
          {(plan === "monthly" || plan === "longterm") && <Field label="Months"><input type="number" min={plan === "longterm" ? 2 : 1} max="24" value={months} onChange={e => setMonths(e.target.value)} style={inputStyle} /></Field>}
          {tripType === "oneway" && route && <div style={infoBox}><strong>{route.distanceKm} km estimated route</strong><span>Approx. {route.hours} hours driving time · recovery/return cost included</span></div>}
          <div><div style={labelStyle}>Fuel</div><div style={choiceGrid}><button type="button" onClick={() => setFuelOption("customer")} style={{ ...choiceButton, borderColor: fuelOption === "customer" ? C.green : C.border, background: fuelOption === "customer" ? C.greenLight : C.white }}><strong>Customer pays fuel</strong><span>Customer fills/refills fuel</span></button><button type="button" onClick={() => setFuelOption("business")} style={{ ...choiceButton, borderColor: fuelOption === "business" ? C.green : C.border, background: fuelOption === "business" ? C.greenLight : C.white }}><strong>Add fuel cost</strong><span>Estimated from vehicle fuel type</span></button></div></div>
          <button type="button" onClick={() => setHomeDelivery((value) => !value)} style={{ ...choiceButton, borderColor: homeDelivery ? C.blue : C.border, background: homeDelivery ? C.sky : C.white }}><strong>Home delivery {homeDelivery ? "selected" : "available"}</strong><span>{Number(settings.deliveryFlatCharge || 0) > 0 ? `Additional ${fmtINR(settings.deliveryFlatCharge)}` : "Additional charge set by admin"}</span></button>
          <div style={fieldGrid}><Field label="Full name"><input value={name} onChange={e => setName(e.target.value)} style={inputStyle} /></Field><Field label="Mobile"><input value={phone} onChange={e => setPhone(e.target.value)} inputMode="numeric" style={inputStyle} /></Field><Field label="Email"><input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} /></Field></div>
          <div style={summaryBox}>
            <div style={summaryRow}><span>Rental</span><strong>{fmtINR(rental)}</strong></div>
            <div style={summaryRow}><span>Extra km</span><strong>{fmtINR(extraKmCost)}</strong></div>
            <div style={summaryRow}><span>Fuel</span><strong>{fuelOption === "customer" ? "Customer pays" : fmtINR(customerFuelCost)}</strong></div>
            {serviceType !== "self" && <div style={summaryRow}><span>Driver / guide</span><strong>{fmtINR(driverCost + guideCost)}</strong></div>}
            {tripType === "oneway" && <div style={summaryRow}><span>Return / recovery</span><strong>{fmtINR(recoveryFuel + recoveryTime)}</strong></div>}
            {deliveryCost > 0 && <div style={summaryRow}><span>Home delivery</span><strong>{fmtINR(deliveryCost)}</strong></div>}
            <div style={summaryRow}><span>Business margin</span><strong>{fmtINR(margin)}</strong></div>
            <div style={{ ...summaryRow, borderTop: `1px solid ${C.border}`, paddingTop: 10, fontSize: 18 }}><span>Total</span><strong style={{ color: C.blue }}>{fmtINR(total)}</strong></div>
          </div>
          <div style={choiceGrid}><button type="button" onClick={() => setPaymentType("advance")} style={{ ...choiceButton, borderColor: paymentType === "advance" ? C.blue : C.border, background: paymentType === "advance" ? C.sky : C.white }}><strong>Pay {fmtINR(advance)}</strong><span>Booking advance</span></button><button type="button" onClick={() => setPaymentType("full")} style={{ ...choiceButton, borderColor: paymentType === "full" ? C.blue : C.border, background: paymentType === "full" ? C.sky : C.white }}><strong>Pay {fmtINR(total)}</strong><span>Full payment</span></button></div>
          <button disabled={loading} style={{ ...primaryButton, width: "100%", opacity: loading ? 0.65 : 1 }}>{loading ? "Opening payment…" : `Continue to PayU · ${fmtINR(paymentAmount)}`}</button>
          <div style={{ fontSize: 12, color: C.gray, textAlign: "center" }}>18+ only · Valid driving licence required · Security deposit depends on vehicle · Fuel, driver, route and recovery charges are shown before payment.</div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) { return <div><div style={labelStyle}>{label}</div>{children}</div>; }

const SITE_DEFAULTS = {
  address: "Indore",
  lat: "22.7525840",
  lng: "75.8916329",
  mapsLink: "https://maps.app.goo.gl/7wp7CfqBHhb1BbDm9?g_st=ic",
  phone1: "74152 28011",
  phone2: "89828 02145",
  whatsapp: "917415228011",
};
const onlyDigits = (p) => String(p || "").replace(/\D/g, "");
const withCode = (p) => {
  const d = onlyDigits(p);
  return d.length === 10 ? `91${d}` : d;
};
function buildContact(info) {
  const i = { ...SITE_DEFAULTS, ...(info || {}) };
  return {
    address: i.address,
    p1: { show: i.phone1, href: `tel:+${withCode(i.phone1)}` },
    p2: { show: i.phone2, href: `tel:+${withCode(i.phone2)}` },
    wa: `https://wa.me/${withCode(i.whatsapp)}`,
    maps: i.mapsLink,
    embed: `https://maps.google.com/maps?q=${i.lat},${i.lng}&z=16&output=embed`,
  };
}
const ContactCtx = createContext(buildContact(SITE_DEFAULTS));
const useContact = () => useContext(ContactCtx);

const inr = (v) => fmtINR(v);
const carPrice = (c) =>
  Number(c.price24 || c.dailyRate || c.price12 || c.price8 || c.price || 0);

function useSeen() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) return setSeen(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}

function CountUp({ to, prefix = "", suffix = "" }) {
  const [ref, seen] = useSeen();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!seen) return;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 1100);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to]);
  return (
    <span ref={ref}>
      {prefix}
      {v.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

/* ------------------------------ logo ------------------------------ */
function Logo({ id = "a", dark }) {
  return (
    <span className="sw-logo">
      <svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true">
        <defs>
          <linearGradient id={`swg-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0e7c86" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill={`url(#swg-${id})`} />
        <path
          d="M33 15c-3-3-12-3-14 2s4 7 8 8 9 3 7 9-11 6-15 2"
          fill="none"
          stroke="#fff"
          strokeWidth="4.6"
          strokeLinecap="round"
        />
        <path
          className="sw-logo-dash"
          d="M33 15c-3-3-12-3-14 2s4 7 8 8 9 3 7 9-11 6-15 2"
          fill="none"
          stroke="#0b1b2b"
          strokeOpacity=".45"
          strokeWidth="1.5"
          strokeDasharray="1 5"
          strokeLinecap="round"
        />
      </svg>
      <span className="sw-logo-text" style={{ color: dark ? "#fff" : undefined }}>
        <b>Sawariya</b>
        <i>Rentals</i>
      </span>
    </span>
  );
}

/* ------------------------------ header ------------------------------ */
function SiteHeader({ profile, onLogin }) {
  const k = useContact();
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const f = () => setStuck(window.scrollY > 8);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  const links = [
    ["Rent a car", "#cars"],
    ["Plans", "#plans"],
    ["Why Sawariya", "#why"],
    ["FAQs", "#faqs"],
  ];
  return (
    <header className={`sw-header ${stuck ? "stuck" : ""}`}>
      <div className="sw-wrap sw-header-in">
        <a href="#top" aria-label="Sawariya Rentals home">
          <Logo id="h" />
        </a>
        <nav className={`sw-nav ${open ? "open" : ""}`}>
          {links.map(([t, h]) => (
            <a key={h} href={h} onClick={() => setOpen(false)}>
              {t}
            </a>
          ))}
        </nav>
        <div className="sw-header-cta">
          <a className="sw-call" href={k.p1.href}>
            <Phone size={16} /> {k.p1.show}
          </a>
          <button className="sw-login" onClick={onLogin}>
            {profile?.name ? `Hi, ${profile.name.split(" ")[0]}` : "Login"}
          </button>
          <button className="sw-burger" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------ hero ------------------------------ */
function CarSilhouette() {
  const Wheel = ({ cx }) => (
    <g>
      <circle cx={cx} cy="62" r="13" fill="#0b1b2b" />
      <g className="sw-wheel" style={{ transformOrigin: `${cx}px 62px` }}>
        <circle cx={cx} cy="62" r="7" fill="#cbd5e1" />
        <path d={`M${cx} 55v14M${cx - 7} 62h14`} stroke="#0b1b2b" strokeWidth="2" />
      </g>
    </g>
  );
  return (
    <svg viewBox="0 0 220 80" className="sw-car" aria-hidden="true">
      <path
        d="M8 58c0-11 8-15 20-16l24-2c10-16 30-22 52-22h22c20 1 34 12 42 24l18 3c14 3 20 8 20 20v5H8z"
        fill="#fff"
      />
      <path d="M64 40c8-9 20-13 36-13h12v13z" fill="#0e7c86" opacity=".4" />
      <path d="M120 27h12c12 1 22 6 28 13h-40z" fill="#0e7c86" opacity=".4" />
      <rect x="196" y="48" width="14" height="5" rx="2.5" fill="#f59e0b" />
      <Wheel cx={58} />
      <Wheel cx={164} />
    </svg>
  );
}

function Hero({ cities, settings, onSearch }) {
  const today = todayISO();
  const [city, setCity] = useState(cities[0]?.name || "");
  const [pd, setPd] = useState(today);
  const [pt, setPt] = useState("09:00");
  const [dd, setDd] = useState(today);
  const [dt, setDt] = useState("18:00");

  useEffect(() => {
    if (!cities.find((c) => c.name === city) && cities[0]) setCity(cities[0].name);
  }, [cities]); // eslint-disable-line

  const names = cities.map((c) => c.name);
  const cityText =
    names.length === 0
      ? "your city"
      : names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

  function submit(e) {
    e.preventDefault();
    onSearch({ city, pd, pt, dd, dt });
    document.getElementById("cars")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <section className="sw-hero" id="top">
        <span className="sw-blob b1" />
        <span className="sw-blob b2" />
        <div className="sw-wrap sw-hero-copy">
          <h1>
            <span>Self-drive cars,</span>
            <span>ready when you are.</span>
          </h1>
          <p>
            Rent by the hour, day, week or month in {cityText}. You see the full price
            before you pay.
          </p>
          <ul className="sw-hero-points">
            <li><CheckCircle2 size={16} /> 18+ with a valid licence</li>
            <li><CheckCircle2 size={16} /> Advance from {inr(settings.bookingAdvance || BOOKING_ADVANCE)}</li>
            <li><CheckCircle2 size={16} /> Driver and guide on request</li>
          </ul>
        </div>
        <div className="sw-road" aria-hidden="true">
          <div className="sw-road-line" />
          <div className="sw-car-wrap">
            <CarSilhouette />
          </div>
        </div>
      </section>

      <form className="sw-search sw-wrap" onSubmit={submit}>
        <label>
          <span>City</span>
          <div>
            <MapPin size={17} />
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              {cities.map((c) => (
                <option key={c.id || c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </label>
        <label>
          <span>Pickup date</span>
          <div>
            <CalendarDays size={17} />
            <input
              type="date"
              min={today}
              value={pd}
              onChange={(e) => {
                setPd(e.target.value);
                if (dd < e.target.value) setDd(e.target.value);
              }}
            />
          </div>
        </label>
        <label>
          <span>Pickup time</span>
          <div>
            <Clock3 size={17} />
            <input type="time" value={pt} onChange={(e) => setPt(e.target.value)} />
          </div>
        </label>
        <label>
          <span>Drop date</span>
          <div>
            <CalendarDays size={17} />
            <input type="date" min={pd} value={dd} onChange={(e) => setDd(e.target.value)} />
          </div>
        </label>
        <label>
          <span>Drop time</span>
          <div>
            <Clock3 size={17} />
            <input type="time" value={dt} onChange={(e) => setDt(e.target.value)} />
          </div>
        </label>
        <button className="sw-btn sw-btn-pea sw-search-btn" type="submit">
          <Search size={18} /> Find cars
        </button>
      </form>

      <div className="sw-marquee" aria-hidden="true">
        <div className="sw-marquee-track">
          {[0, 1].map((k) => (
            <div key={k} className="sw-marquee-set">
              {["Hourly rentals", "Daily rentals", "Weekly rentals", "Monthly rentals", "2-year plans", "Home delivery", "Driver and guide", "Airport pickup and drop"].map((t) => (
                <span key={t + k}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ------------------------------ plans, packages, decorations ------------------------------ */
function Plans({ s, packages, decorations }) {
  const items = [
    { cls: "p1", icon: <Clock3 size={24} />, title: "Hourly", price: s.hourlyStartingPrice, unit: "per hour", note: `${s.hourlyIncludedKm} km included per hour` },
    { cls: "p2", icon: <Car size={24} />, title: "Daily", price: s.dailyStartingPrice, unit: "per day", note: `${s.dailyIncludedKm} km included per day` },
    { cls: "p3", icon: <CalendarDays size={24} />, title: "Weekly", price: s.weeklyStartingPrice, unit: "per week", note: "Best for longer trips" },
    { cls: "p4", icon: <CalendarDays size={24} />, title: "Monthly", price: s.monthlyStartingPrice, unit: "per month", note: "1-month plan" },
    { cls: "p5", icon: <IndianRupee size={24} />, title: "2-year offer", price: s.longTermMonthlyPrice, unit: "per month", note: `${s.longTermMonths}-month commitment` },
  ];
  return (
    <section className="sw-section" id="plans">
      <div className="sw-wrap">
        <h2>Pick how long you need the car</h2>
        <div className="sw-plans">
          {items.map((p) => (
            <a key={p.title} className={`sw-plan ${p.cls}`} href="#cars">
              <span className="sw-plan-ico">{p.icon}</span>
              <h3>{p.title}</h3>
              <strong>{inr(p.price)}</strong>
              <em>{p.unit}</em>
              <p>{p.note}</p>
            </a>
          ))}
        </div>

        {packages.length > 0 && (
          <>
            <h2 className="sw-sub">Travel packages</h2>
            <p className="sw-sub-note">Ujjain, Omkareshwar, Mandu and more. Go self-drive, with a driver, or with a guide.</p>
            <div className="sw-row">
              {packages.map((item) => (
                <div key={item.id} className="sw-mini">
                  <span className="sw-tag">{item.days} day{item.days === 1 ? "" : "s"}</span>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="sw-tags">
                    <span className="sw-tag">Self drive</span>
                    <span className="sw-tag">Driver</span>
                    <span className="sw-tag">Guide</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {decorations.length > 0 && (
          <>
            <h2 className="sw-sub">Decorated cars</h2>
            <p className="sw-sub-note">Birthday, wedding, anniversary, proposal and custom themes.</p>
            <div className="sw-row">
              {decorations.map((item) => (
                <div key={item.id} className="sw-mini">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <strong className="sw-mini-price">
                    {item.price ? `From ${inr(item.price)}` : "Price on request"}
                  </strong>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ cars ------------------------------ */
function CarTile({ car, onOpen }) {
  const ref = useRef(null);
  const photo = car.photos?.[0];
  const price = carPrice(car);
  function move(e) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 5).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 7).toFixed(2)}deg`);
  }
  function leave() {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  }
  return (
    <article className="sw-tile" ref={ref} onPointerMove={move} onPointerLeave={leave}>
      <div className="sw-tile-img" onClick={() => onOpen(car)}>
        {photo ? <img src={photo} alt={car.name} loading="lazy" /> : <Car size={54} strokeWidth={1.2} />}
        <span className={`sw-status ${car.available ? "ok" : "no"}`}>
          {car.available ? "Available" : "Rented out"}
        </span>
      </div>
      <div className="sw-tile-body">
        <small>{[car.type, car.city].filter(Boolean).join(", ")}</small>
        <h3>{car.name}</h3>
        <ul>
          <li><Fuel size={15} /> {car.fuel || "Petrol"}</li>
          <li><Settings size={15} /> {car.transmission || "Manual"}</li>
          <li><Users size={15} /> {car.seats || 5} seats</li>
        </ul>
        <div className="sw-tile-foot">
          <div>
            {price > 0 ? (
              <>
                <strong>{inr(price)}</strong> <span>per day</span>
              </>
            ) : (
              <strong className="sw-ask">Call for price</strong>
            )}
          </div>
          <button className="sw-btn sw-btn-pea" disabled={!car.available} onClick={() => onOpen(car)}>
            Book
          </button>
        </div>
      </div>
    </article>
  );
}

function CarsSection({ cars, cities, cityFilter, setCityFilter, schedule, onClearSchedule, onOpen }) {
  const k = useContact();
  const [type, setType] = useState("All");
  const [q, setQ] = useState("");
  const types = useMemo(
    () => ["All", ...Array.from(new Set(cars.map((c) => c.type).filter(Boolean)))],
    [cars]
  );
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return cars.filter((c) => {
      const cityOk = cityFilter === "All" || c.city === cityFilter;
      const typeOk = type === "All" || c.type === type;
      const textOk =
        !t ||
        String(c.name || "").toLowerCase().includes(t) ||
        String(c.type || "").toLowerCase().includes(t) ||
        String(c.city || "").toLowerCase().includes(t);
      return cityOk && typeOk && textOk;
    });
  }, [cars, cityFilter, type, q]);

  return (
    <section className="sw-section sw-tint" id="cars">
      <div className="sw-wrap">
        <div className="sw-head-row">
          <h2>{cityFilter === "All" ? "Our cars" : `Cars in ${cityFilter}`}</h2>
          <span className="sw-count">
            {list.length} car{list.length === 1 ? "" : "s"} found
          </span>
        </div>
        {schedule && (
          <p className="sw-note">
            {schedule.pd} {schedule.pt} to {schedule.dd} {schedule.dt}. The final price for your dates is
            worked out when you tap Book.{" "}
            <button className="sw-link" onClick={onClearSchedule}>Clear</button>
          </p>
        )}
        <div className="sw-toolbar">
          <div className="sw-field">
            <Search size={17} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cars" />
          </div>
          <div className="sw-field">
            <MapPin size={17} />
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
              <option value="All">All cities</option>
              {cities.map((c) => (
                <option key={c.id || c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {types.length > 2 && (
          <div className="sw-chips">
            {types.map((t) => (
              <button key={t} className={`sw-chip ${t === type ? "on" : ""}`} onClick={() => setType(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
        {list.length ? (
          <div className="sw-grid">
            {list.map((c) => (
              <CarTile key={c.id || c.name} car={c} onOpen={onOpen} />
            ))}
          </div>
        ) : (
          <div className="sw-empty">
            <Car size={40} strokeWidth={1.3} />
            <h3>No cars to show right now</h3>
            <p>Call {k.p1.show} or message us on WhatsApp and we will check what is free.</p>
            <a className="sw-btn sw-btn-saf" href={k.wa} target="_blank" rel="noreferrer">
              <MessageCircle size={16} /> Ask on WhatsApp
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ car detail ------------------------------ */
function CarDetail({ car, settings, onBack, onBook, onZoom }) {
  const k = useContact();
  const [idx, setIdx] = useState(0);
  const photos = car.photos || [];
  const hourly = Number(car.hourlyRate ?? car.price8 ?? settings.hourlyStartingPrice);
  const daily = Number(car.dailyRate ?? car.price24 ?? settings.dailyStartingPrice);
  const weekly = Number(car.weeklyRate ?? settings.weeklyStartingPrice);
  const monthly = Number(car.monthlyRate ?? settings.monthlyStartingPrice);
  const rates = [
    ["Hourly", `${inr(hourly)} per hour`],
    ["Daily", `${inr(daily)} per day`],
    ["Weekly", `${inr(weekly)} per week`],
    ["Monthly", `${inr(monthly)} per month`],
  ];
  return (
    <div className="sw-detail">
      <div className="sw-detail-bar">
        <button onClick={onBack}>
          <ChevronLeft size={18} /> Back
        </button>
        <strong>Sawariya Rentals</strong>
        <a href={k.wa} target="_blank" rel="noreferrer">WhatsApp</a>
      </div>
      <div className="sw-wrap sw-detail-grid">
        <div>
          <div className="sw-gallery-main" onClick={() => photos[idx] && onZoom(photos[idx])}>
            {photos[idx] ? <img src={photos[idx]} alt={car.name} /> : <Car size={72} strokeWidth={1.1} />}
          </div>
          {photos.length > 1 && (
            <div className="sw-thumbs">
              {photos.map((src, i) => (
                <img key={i} src={src} alt="" className={i === idx ? "on" : ""} onClick={() => setIdx(i)} />
              ))}
            </div>
          )}
          {photos.length > 0 && <p className="sw-note">Tap the photo to zoom.</p>}
        </div>
        <div>
          <span className={`sw-status inline ${car.available ? "ok" : "no"}`}>
            {car.available ? "Available" : "Rented out"}
          </span>
          <h2 className="sw-detail-title">{car.name}</h2>
          <p className="sw-detail-sub">{[car.type, car.city, "Self drive"].filter(Boolean).join(", ")}</p>
          <ul className="sw-detail-meta">
            <li><Fuel size={16} /> {car.fuel || "Petrol"}</li>
            <li><Settings size={16} /> {car.transmission || "Manual"}</li>
            <li><Users size={16} /> {car.seats || 5} seats</li>
          </ul>
          <div className="sw-rates">
            {rates.map(([k, v]) => (
              <div key={k} className="sw-rate">
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
          <button className="sw-btn sw-btn-pea sw-wide" disabled={!car.available} onClick={() => onBook(car)}>
            Book this car
          </button>
          <a className="sw-btn sw-btn-wa sw-wide" href={`${k.wa}?text=Hi%20Sawariya%20Rentals`} target="_blank" rel="noreferrer">
            <MessageCircle size={17} /> WhatsApp us, {k.p1.show}
          </a>
          <p className="sw-note center">or call {k.p2.show}</p>

          <div className="sw-info">
            <h3>About Sawariya Rentals</h3>
            <p>Self-drive car rental in Indore. Clean cars, clear rates, WhatsApp support. Book 8, 12 or 24 hours, or several days.</p>
          </div>
          <div className="sw-info">
            <h3>Why renters pick us</h3>
            <ul>
              <li>Clean, maintained cars</li>
              <li>Fair Indore pricing</li>
              <li>24x7 customer service</li>
              <li>Same-day booking if available</li>
              <li>Easy extension on WhatsApp</li>
            </ul>
          </div>
          <div className="sw-info">
            <h3>Our services</h3>
            <ul>
              <li>Self drive hatchback, SUV and CNG</li>
              <li>8, 12 and 24 hour packages</li>
              <li>Multi-day outstation trips</li>
              <li>Airport pickup and drop (IDR)</li>
              <li>24x7 call and WhatsApp help</li>
            </ul>
          </div>
          <div className="sw-info">
            <h3>Airport pickup and drop</h3>
            <p>Devi Ahilya Bai Holkar Airport (IDR). Share your flight time on WhatsApp and we arrange pickup or drop with the booked car.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ stats ------------------------------ */
function Stats({ cars, cities, s }) {
  const priced = cars.map(carPrice).filter((p) => p > 0);
  const avg = priced.length ? Math.round(priced.reduce((a, b) => a + b, 0) / priced.length) : Number(s.dailyStartingPrice) || 0;
  const free = cars.filter((c) => c.available).length;
  const items = [
    { k: "Cheapest hourly rate", v: <CountUp to={Number(s.hourlyStartingPrice) || 0} prefix="₹" />, u: "per hour" },
    { k: "Average daily price", v: <CountUp to={avg} prefix="₹" />, u: "per day" },
    { k: "Cars free right now", v: <CountUp to={free} />, u: free === 1 ? "car" : "cars" },
    { k: "Kilometres included", v: <CountUp to={Number(s.dailyIncludedKm) || 0} />, u: "km per day" },
    { k: "Cities served", v: <CountUp to={cities.length} />, u: cities.length === 1 ? "city" : "cities" },
  ];
  return (
    <section className="sw-stats">
      <div className="sw-wrap">
        <h2>Our numbers today</h2>
        <div className="sw-stat-row">
          {items.map((i) => (
            <div key={i.k} className="sw-stat">
              <span>{i.k}</span>
              <strong>{i.v}</strong>
              <em>{i.u}</em>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ why ------------------------------ */
function Why() {
  const k = useContact();
  const items = [
    { i: <Home size={26} />, t: "Delivery and pickup at your door", d: "Choose home delivery while booking and tell us where and when." },
    { i: <Gauge size={26} />, t: "Plans that fit the trip", d: "Hourly, daily, weekly, monthly or a 2-year plan. Extra kilometres are charged by the km." },
    { i: <Wrench size={26} />, t: "Cars that are looked after", d: "Clean, maintained cars with clear rates." },
    { i: <Headphones size={26} />, t: "A real person on the phone", d: `Call ${k.p1.show} or message us on WhatsApp.` },
  ];
  return (
    <section className="sw-section" id="why">
      <div className="sw-wrap">
        <h2>Why rent from Sawariya</h2>
        <div className="sw-why">
          {items.map((x) => (
            <div key={x.t} className="sw-why-card">
              <span>{x.i}</span>
              <h3>{x.t}</h3>
              <p>{x.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ faqs ------------------------------ */
function Faqs({ s }) {
  const [open, setOpen] = useState(0);
  const faqs = [
    ["What is the minimum age to rent a car?", "You must be at least 18 and hold a valid driving licence."],
    ["What do I need to carry?", "Your original driving licence and a government photo ID. We confirm the rest when you book."],
    ["Is there a security deposit?", "Yes. The amount depends on the car and is told to you before pickup."],
    ["Which rental plans do you offer?", `Hourly from ${inr(s.hourlyStartingPrice)} an hour (${s.hourlyIncludedKm} km per hour), daily from ${inr(s.dailyStartingPrice)} (${s.dailyIncludedKm} km per day), weekly, monthly, and a 2-year plan at ${inr(s.longTermMonthlyPrice)} a month.`],
    ["What if I drive more than the included km?", `Extra kilometres are charged at ${inr(s.extraKmRate)} per km.`],
    ["Who pays for fuel?", "You pick one of two options in the booking form: you fill the fuel yourself, or we add an estimated fuel cost to the total."],
    ["Can I get a driver or a guide?", "Yes. Choose With driver, or Driver + guide for tours, and the cost appears in your summary."],
    ["Can I book a one-way trip?", "Yes. Select One-way, choose your destination, and the return and recovery cost is added automatically."],
    ["Do you deliver the car to my home?", "Yes, home delivery is available. Any extra charge is shown before you pay."],
    ["How do I pay?", `Pay an advance of ${inr(s.bookingAdvance)} or the full amount online through PayU. The balance, if any, is shown in your summary.`],
  ];
  return (
    <section className="sw-section sw-tint" id="faqs">
      <div className="sw-wrap sw-faq-wrap">
        <h2>Questions people ask us</h2>
        <div className="sw-faq">
          {faqs.map(([q, a], i) => (
            <div key={q} className={`sw-faq-item ${open === i ? "open" : ""}`}>
              <button aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{q}</span>
                <ChevronDown size={20} />
              </button>
              <div className="sw-faq-body">
                <p>{a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ callback ------------------------------ */
function Callback({ city }) {
  const k = useContact();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("idle");
  async function submit(e) {
    e.preventDefault();
    const clean = phone.replace(/\D/g, "");
    if (!/^\d{10}$/.test(clean)) return setState("bad");
    setState("sending");
    try {
      await insertLead({
        name: name.trim() || "Website lead",
        phone: clean,
        city,
        carName: "",
        message: "Callback request from homepage",
      });
      setState("done");
    } catch {
      setState("fail");
    }
  }
  return (
    <section className="sw-callback">
      <div className="sw-wrap sw-callback-in">
        <div>
          <h2>Not sure which car fits?</h2>
          <p>Leave your number and we will call you back, or call us directly.</p>
          <div className="sw-callback-links">
            <a href={k.p1.href}><Phone size={16} /> {k.p1.show}</a>
            <a href={k.p2.href}><Phone size={16} /> {k.p2.show}</a>
          </div>
        </div>
        {state === "done" ? (
          <div className="sw-thanks">
            <CheckCircle2 size={34} />
            <b>Got it. We will call you soon.</b>
          </div>
        ) : (
          <form onSubmit={submit}>
            <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <input
              placeholder="10-digit mobile number"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button className="sw-btn sw-btn-saf" disabled={state === "sending"}>
              {state === "sending" ? "Sending" : "Call me back"}
            </button>
            {state === "bad" && <small>Enter a 10-digit mobile number.</small>}
            {state === "fail" && <small>Could not send. Please call us instead.</small>}
          </form>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ footer ------------------------------ */
function SiteFooter({ cities }) {
  const k = useContact();
  return (
    <>
      <section className="sw-section">
        <div className="sw-wrap sw-visit">
          <div>
            <h2>Visit Sawariya Rentals</h2>
            <p className="sw-visit-text">{k.address}. Call {k.p1.show} or {k.p2.show}.</p>
            <a className="sw-btn sw-btn-pea" href={k.maps} target="_blank" rel="noreferrer">
              <MapPin size={17} /> Open in Maps
            </a>
          </div>
          <div className="sw-map">
            <iframe title="Sawariya Rentals location" src={k.embed} width="100%" height="280" style={{ border: 0 }} loading="lazy" />
          </div>
        </div>
      </section>
      <footer className="sw-footer">
        <div className="sw-wrap sw-footer-in">
          <div>
            <Logo id="f" dark />
            <p>Self-drive cars in your city.</p>
          </div>
          <div>
            <h4>Contact</h4>
            <a href={k.p1.href}>{k.p1.show}</a>
            <a href={k.p2.href}>{k.p2.show}</a>
            <a href={k.wa} target="_blank" rel="noreferrer">WhatsApp</a>
            <a href={k.maps} target="_blank" rel="noreferrer">Find our location</a>
          </div>
          <div>
            <h4>Cities</h4>
            {cities.map((c) => (
              <span key={c.id || c.name}>{c.name}</span>
            ))}
          </div>
          <div>
            <h4>Explore</h4>
            <a href="#cars">Rent a car</a>
            <a href="#plans">Plans</a>
            <a href="#why">Why Sawariya</a>
            <a href="#faqs">FAQs</a>
          </div>
        </div>
        <div className="sw-wrap sw-copy">
          © {new Date().getFullYear()} Sawariya Rentals. Renters must be 18+ with a valid driving licence.
        </div>
      </footer>
    </>
  );
}

/* =========================================================
   CUSTOMER VIEW (new storefront)
========================================================= */

function CustomerView({ cars: carsProp, cities: citiesProp, onBook }) {
  const cars = Array.isArray(carsProp) ? carsProp : [];
  const cities = (Array.isArray(citiesProp) ? citiesProp : []).filter((c) => c.active);

  const [cityFilter, setCityFilter] = useState("All");
  const [schedule, setSchedule] = useState(null);
  const [detailCar, setDetailCar] = useState(null);
  const [bookingCar, setBookingCar] = useState(null);
  const [zoom, setZoom] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profile, setProfile] = useState(() => loadShared("sawariya_customer_profile", null));
  const [loginName, setLoginName] = useState("");
  const [loginPhone, setLoginPhone] = useState("");

  const settings = useMemo(
    () => ({
      ...DEFAULT_BUSINESS_SETTINGS,
      ...(loadShared("sawariya_business_settings", DEFAULT_BUSINESS_SETTINGS) || {}),
    }),
    []
  );
  const packages = useMemo(() => {
    const p = loadShared("sawariya_travel_packages", DEFAULT_TRAVEL_PACKAGES);
    return Array.isArray(p) ? p : DEFAULT_TRAVEL_PACKAGES;
  }, []);
  const decorations = useMemo(() => {
    const d = loadShared("sawariya_decorations", DEFAULT_DECORATIONS);
    return Array.isArray(d) ? d : DEFAULT_DECORATIONS;
  }, []);

  useEffect(() => {
    if (!detailCar) return;
    const prev = document.body.style.overflowY;
    document.body.style.overflowY = "hidden";
    return () => {
      document.body.style.overflowY = prev;
    };
  }, [detailCar]);

  function openLogin() {
    setLoginName(profile?.name || "");
    setLoginPhone(profile?.phone || "");
    setLoginOpen(true);
  }
  function saveProfile() {
    const name = loginName.trim();
    const phone = loginPhone.replace(/\D/g, "");
    if (!name || !/^\d{10}$/.test(phone)) {
      return alert("Enter your name and valid 10-digit mobile number.");
    }
    const p = { name, phone };
    saveShared("sawariya_customer_profile", p);
    setProfile(p);
    setLoginOpen(false);
  }
  function handleConfirmBooking(data) {
    onBook(data);
    setBookingCar(null);
    setDetailCar(null);
  }

  const contact = useMemo(
    () => buildContact(loadShared("sawariya_site_info", SITE_DEFAULTS)),
    []
  );
  const callbackCity =
    cityFilter !== "All" ? cityFilter : cities[0]?.name || "Indore";

  return (
    <ContactCtx.Provider value={contact}>
    <div className="sw">
      <style>{CSS}</style>
      <SiteHeader profile={profile} onLogin={openLogin} />
      <Hero
        cities={cities}
        settings={settings}
        onSearch={(s) => {
          setSchedule(s);
          setCityFilter(s.city || "All");
        }}
      />
      <Plans s={settings} packages={packages} decorations={decorations} />
      <CarsSection
        cars={cars}
        cities={cities}
        cityFilter={cityFilter}
        setCityFilter={setCityFilter}
        schedule={schedule}
        onClearSchedule={() => {
          setSchedule(null);
          setCityFilter("All");
        }}
        onOpen={setDetailCar}
      />
      <Stats cars={cars} cities={cities} s={settings} />
      <Why />
      <Faqs s={settings} />
      <Callback city={callbackCity} />
      <SiteFooter cities={cities} />

      <a className="sw-wa" href={contact.wa} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
        <MessageCircle size={26} />
      </a>

      {detailCar && (
        <CarDetail
          car={detailCar}
          settings={settings}
          onBack={() => setDetailCar(null)}
          onBook={setBookingCar}
          onZoom={setZoom}
        />
      )}
      {zoom && (
        <div className="sw-zoom" onClick={() => setZoom(null)}>
          <img src={zoom} alt="" />
        </div>
      )}
      {loginOpen && (
        <div style={modalBackdrop}>
          <div style={{ ...modalCard, maxWidth: 430 }}>
            <div style={modalHeader}>
              <div>
                <Badge color={C.blue}>Customer account</Badge>
                <h2 style={{ margin: "8px 0 0" }}>Quick login</h2>
              </div>
              <button type="button" onClick={() => setLoginOpen(false)} style={iconButton}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 18, display: "grid", gap: 12 }}>
              <Field label="Name">
                <input value={loginName} onChange={(e) => setLoginName(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Mobile">
                <input value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} inputMode="numeric" style={inputStyle} />
              </Field>
              <button type="button" style={primaryButton} onClick={saveProfile}>
                Save profile
              </button>
              <div style={{ fontSize: 12, color: C.gray }}>
                This is a quick profile for easier booking. It is not OTP-based authentication.
              </div>
            </div>
          </div>
        </div>
      )}
      {bookingCar && (
        <BookingModal
          car={bookingCar}
          onClose={() => setBookingCar(null)}
          onConfirm={handleConfirmBooking}
        />
      )}
    </div>
    </ContactCtx.Provider>
  );
}

/* ------------------------------ storefront styles ------------------------------ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Instrument+Sans:wght@400;500;600;700&display=swap');
html{scroll-behavior:smooth}
.sw{--ink:#0b1b2b;--pea:#0e7c86;--pead:#0a5f67;--saf:#f59e0b;--saf2:#ffb938;--mist:#f2f7f8;--line:#e0e9ec;--muted:#566774;
 font-family:'Instrument Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--ink);background:#fff;overflow-x:hidden;line-height:1.5}
.sw *{box-sizing:border-box}
.sw h1,.sw h2,.sw h3,.sw h4{font-family:'Bricolage Grotesque','Instrument Sans',sans-serif;margin:0;letter-spacing:-.02em;line-height:1.1}
.sw a{color:inherit;text-decoration:none}
.sw button{font-family:inherit;cursor:pointer}
.sw :focus-visible{outline:3px solid var(--saf);outline-offset:2px}
.sw-wrap{max-width:1160px;margin:0 auto;padding:0 20px}
.sw-section{padding:72px 0;scroll-margin-top:70px}
.sw-tint{background:var(--mist)}
.sw-section h2,.sw-stats h2,.sw-callback h2{font-size:clamp(26px,4vw,38px);font-weight:800;margin-bottom:28px}
.sw-section h2.sw-sub{font-size:clamp(22px,3vw,28px);margin:46px 0 6px}
.sw-sub-note{margin:0 0 16px;color:var(--muted);font-size:15px}

.sw-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:12px;padding:0 20px;min-height:46px;font-weight:700;font-size:15px;transition:transform .18s,box-shadow .18s,background .18s}
.sw-btn:hover:not(:disabled){transform:translateY(-2px)}
.sw-btn:active:not(:disabled){transform:translateY(0) scale(.97)}
.sw-btn:disabled{opacity:.5;cursor:not-allowed}
.sw-btn-pea{background:var(--pea);color:#fff!important;box-shadow:0 8px 18px -8px var(--pea)}
.sw-btn-pea:hover:not(:disabled){background:var(--pead)}
.sw-btn-saf{background:var(--saf);color:var(--ink)!important;box-shadow:0 8px 18px -8px var(--saf)}
.sw-btn-saf:hover:not(:disabled){background:var(--saf2)}
.sw-btn-wa{background:#1a9d6c;color:#fff!important}
.sw-wide{width:100%;margin-top:10px}

.sw-logo{display:inline-flex;align-items:center;gap:10px}
.sw-logo-text{display:flex;flex-direction:column;line-height:1}
.sw-logo-text b{font-family:'Bricolage Grotesque',sans-serif;font-size:21px;font-weight:800;letter-spacing:-.03em}
.sw-logo-text i{font-style:normal;font-size:12px;font-weight:600;color:var(--pea);margin-top:3px;letter-spacing:.14em}
.sw-logo-dash{stroke-dashoffset:0;animation:swdash 2.4s linear infinite}
@keyframes swdash{to{stroke-dashoffset:-24}}

.sw-header{position:sticky;top:0;z-index:60;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-bottom:1px solid transparent;transition:border-color .2s,box-shadow .2s}
.sw-header.stuck{border-color:var(--line);box-shadow:0 8px 24px -16px rgba(11,27,43,.35)}
.sw-header-in{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:68px}
.sw-nav{display:flex;gap:26px;font-weight:600;font-size:15px}
.sw-nav a{position:relative;padding:6px 0}
.sw-nav a::after{content:"";position:absolute;left:0;bottom:0;height:2px;width:100%;background:var(--saf);transform:scaleX(0);transform-origin:left;transition:transform .25s}
.sw-nav a:hover::after{transform:scaleX(1)}
.sw-header-cta{display:flex;align-items:center;gap:12px}
.sw-call{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:14px;color:var(--pea)}
.sw-login{border:1.5px solid var(--ink);background:#fff;color:var(--ink);border-radius:10px;padding:8px 16px;font-weight:700;font-size:14px;transition:background .2s,color .2s}
.sw-login:hover{background:var(--ink);color:#fff}
.sw-burger{display:none;background:none;border:0;color:var(--ink);padding:6px}

.sw-hero{position:relative;color:#fff;padding:64px 0 210px;overflow:hidden;
 background:radial-gradient(900px 420px at 85% -10%,rgba(20,163,174,.45),transparent 60%),linear-gradient(165deg,#06202e 0%,#0a4a55 58%,#0e7c86 100%)}
.sw-blob{position:absolute;border-radius:50%;filter:blur(46px);opacity:.3;animation:swfloat 16s ease-in-out infinite}
.sw-blob.b1{width:300px;height:300px;background:var(--saf);left:-90px;top:-70px}
.sw-blob.b2{width:360px;height:360px;background:#14a3ae;right:-100px;top:90px;animation-delay:-7s}
@keyframes swfloat{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(34px,44px) scale(1.12)}}
.sw-hero-copy{position:relative;z-index:2}
.sw-hero h1{font-size:clamp(38px,7vw,74px);font-weight:800;max-width:760px}
.sw-hero h1 span{display:block;opacity:0;transform:translateY(24px);animation:swup .8s cubic-bezier(.2,.8,.2,1) forwards}
.sw-hero h1 span:nth-child(2){animation-delay:.18s;color:var(--saf2)}
.sw-hero p{max-width:520px;font-size:18px;color:#d3eef0;margin:20px 0 0;opacity:0;animation:swup .8s .36s cubic-bezier(.2,.8,.2,1) forwards}
.sw-hero-points{display:flex;flex-wrap:wrap;gap:10px 22px;list-style:none;padding:0;margin:26px 0 0;font-size:14px;font-weight:600;opacity:0;animation:swup .8s .5s cubic-bezier(.2,.8,.2,1) forwards}
.sw-hero-points li{display:inline-flex;align-items:center;gap:7px}
.sw-hero-points svg{color:var(--saf2)}
@keyframes swup{to{opacity:1;transform:none}}
.sw-road{position:absolute;left:0;right:0;bottom:110px;height:58px;background:#06161f;border-top:3px solid rgba(255,255,255,.12)}
.sw-road-line{position:absolute;left:0;right:0;top:27px;height:4px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.75) 0 34px,transparent 34px 72px);animation:swroad 1.1s linear infinite}
@keyframes swroad{to{background-position-x:-72px}}
.sw-car-wrap{position:absolute;bottom:20px;left:-260px;width:220px;animation:swdrive 11s linear infinite;animation-delay:.6s}
.sw-car{width:220px;height:auto;display:block;filter:drop-shadow(0 10px 8px rgba(0,0,0,.35));animation:swbob .5s ease-in-out infinite alternate}
@keyframes swdrive{to{transform:translateX(calc(100vw + 300px))}}
@keyframes swbob{to{transform:translateY(-2px)}}
.sw-wheel{transform-box:view-box;animation:swspin .5s linear infinite}
@keyframes swspin{to{transform:rotate(360deg)}}

.sw-search{position:relative;z-index:5;margin-top:-92px;background:#fff;border-radius:22px;padding:18px;display:grid;grid-template-columns:1.1fr 1.1fr .9fr 1.1fr .9fr auto;gap:12px;align-items:end;box-shadow:0 30px 60px -24px rgba(6,32,46,.45);max-width:1120px}
.sw-search label span{display:block;font-size:13px;font-weight:600;color:var(--muted);margin-bottom:6px}
.sw-search label div{display:flex;align-items:center;gap:8px;border:1.5px solid var(--line);border-radius:12px;padding:0 12px;height:48px;color:var(--pea);transition:border-color .2s,box-shadow .2s}
.sw-search label div:focus-within{border-color:var(--pea);box-shadow:0 0 0 4px rgba(14,124,134,.14)}
.sw-search select,.sw-search input{border:0;outline:0;background:transparent;width:100%;font:inherit;font-size:15px;font-weight:600;color:var(--ink);min-width:0;padding:0;height:auto}
.sw-search-btn{height:48px}

.sw-marquee{overflow:hidden;margin-top:34px;border-block:1px solid var(--line);background:#fff}
.sw-marquee-track{display:flex;width:max-content;animation:swmarq 38s linear infinite}
.sw-marquee-set{display:flex}
.sw-marquee-set span{padding:14px 28px;font-weight:600;font-size:15px;color:var(--muted);white-space:nowrap;position:relative}
.sw-marquee-set span::after{content:"";position:absolute;right:-4px;top:50%;width:8px;height:8px;margin-top:-4px;background:var(--saf);transform:rotate(45deg)}
@keyframes swmarq{to{transform:translateX(-50%)}}

.sw-plans{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
.sw-plan{position:relative;display:flex;flex-direction:column;gap:4px;padding:20px;border-radius:20px;color:#fff;min-height:210px;transition:transform .25s}
.sw-plan:hover{transform:translateY(-6px)}
.sw-plan h3{font-size:19px;font-weight:800;margin-top:12px}
.sw-plan strong{font-family:'Bricolage Grotesque',sans-serif;font-size:32px;font-weight:800;line-height:1.1;margin-top:6px}
.sw-plan em{font-style:normal;font-size:13px;opacity:.85}
.sw-plan p{margin:auto 0 0;padding-top:10px;font-size:13.5px;opacity:.92}
.sw-plan-ico{width:44px;height:44px;border-radius:13px;background:rgba(255,255,255,.18);display:grid;place-items:center;transition:transform .35s}
.sw-plan:hover .sw-plan-ico{transform:rotate(-12deg) scale(1.1)}
.sw-plan.p1{background:linear-gradient(150deg,#0e7c86,#0a4a55)}
.sw-plan.p2{background:linear-gradient(150deg,#12606b,#0b3a45)}
.sw-plan.p3{background:linear-gradient(150deg,#16384d,#0b1b2b)}
.sw-plan.p4{background:linear-gradient(150deg,#1a9d6c,#0f6b52)}
.sw-plan.p5{background:linear-gradient(150deg,#e08a00,#b45309)}

.sw-row{display:flex;gap:14px;overflow-x:auto;padding:4px 0 10px;scroll-snap-type:x proximity}
.sw-mini{flex:0 0 auto;width:250px;border:1px solid var(--line);border-radius:18px;padding:18px;background:#fff;scroll-snap-align:start;transition:border-color .2s,transform .25s}
.sw-mini:hover{border-color:var(--pea);transform:translateY(-3px)}
.sw-mini h3{font-size:19px;font-weight:800;margin:10px 0 6px}
.sw-mini p{margin:0;color:var(--muted);font-size:14px}
.sw-mini-price{display:block;margin-top:12px;font-size:15px;color:var(--pea)}
.sw-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}
.sw-tag{display:inline-block;font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;background:var(--mist);color:var(--pead)}

.sw-head-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.sw-count{color:var(--muted);font-size:14px;font-weight:600;margin-bottom:28px}
.sw-link{background:none;border:0;color:var(--pea);font-weight:700;font-size:14px;text-decoration:underline;text-underline-offset:3px;padding:0}
.sw-note{margin:-14px 0 18px;color:var(--muted);font-size:14px}
.sw-note.center{text-align:center;margin:8px 0 18px}
.sw-toolbar{display:grid;grid-template-columns:1.4fr 1fr;gap:12px;margin-bottom:14px}
.sw-field{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:0 12px;height:48px;color:var(--pea);transition:border-color .2s,box-shadow .2s}
.sw-field:focus-within{border-color:var(--pea);box-shadow:0 0 0 4px rgba(14,124,134,.14)}
.sw-field input,.sw-field select{border:0;outline:0;background:transparent;width:100%;font:inherit;font-size:15px;font-weight:600;color:var(--ink);padding:0;height:auto}
.sw-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 18px}
.sw-chip{border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:8px 16px;font-weight:600;font-size:14px;white-space:nowrap;color:var(--ink);transition:all .2s}
.sw-chip:hover{border-color:var(--pea)}
.sw-chip.on{background:var(--ink);border-color:var(--ink);color:#fff}
.sw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:20px;margin-top:6px}
.sw-tile{--rx:0deg;--ry:0deg;background:#fff;border:1px solid var(--line);border-radius:22px;overflow:hidden;transform:perspective(900px) rotateX(var(--rx)) rotateY(var(--ry));transition:transform .18s ease-out,box-shadow .25s}
.sw-tile:hover{box-shadow:0 26px 40px -24px rgba(11,27,43,.45)}
.sw-tile-img{position:relative;aspect-ratio:16/10;background:linear-gradient(135deg,#d9eef0,#f6fafb);display:grid;place-items:center;color:var(--pea);overflow:hidden;cursor:pointer}
.sw-tile-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s}
.sw-tile:hover .sw-tile-img img{transform:scale(1.07)}
.sw-status{position:absolute;top:12px;left:12px;font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;background:#fff}
.sw-status.inline{position:static;display:inline-block;background:var(--mist)}
.sw-status.ok{color:#117a4a}.sw-status.no{color:#b42318}
.sw-tile-body{padding:16px 18px 18px}
.sw-tile-body small{color:var(--muted);font-size:13px;font-weight:600}
.sw-tile-body h3{font-size:21px;font-weight:800;margin:4px 0 12px}
.sw-tile-body ul{display:flex;flex-wrap:wrap;gap:8px 16px;list-style:none;padding:0;margin:0 0 16px;font-size:13.5px;color:var(--muted);font-weight:600}
.sw-tile-body li{display:inline-flex;align-items:center;gap:6px}
.sw-tile-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px dashed var(--line);padding-top:14px}
.sw-tile-foot strong{font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800}
.sw-tile-foot span{font-size:13px;color:var(--muted)}
.sw-tile-foot .sw-ask{font-size:17px;color:var(--pea)}
.sw-empty{text-align:center;background:#fff;border:1.5px dashed var(--line);border-radius:22px;padding:48px 20px;color:var(--pea)}
.sw-empty h3{color:var(--ink);font-size:22px;margin:12px 0 6px}
.sw-empty p{color:var(--muted);margin:0 0 18px}

.sw-detail{position:fixed;inset:0;z-index:80;background:#fff;overflow-y:auto;color:var(--ink)}
.sw-detail-bar{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:var(--ink);color:#fff}
.sw-detail-bar button{display:inline-flex;align-items:center;gap:4px;background:none;border:0;color:#fff;font-weight:700;font-size:15px}
.sw-detail-bar a{font-size:14px;font-weight:600}
.sw-detail-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:32px;padding-top:28px;padding-bottom:60px;align-items:start}
.sw-gallery-main{aspect-ratio:16/10;border-radius:22px;overflow:hidden;background:linear-gradient(135deg,#d9eef0,#f6fafb);display:grid;place-items:center;color:var(--pea);cursor:zoom-in}
.sw-gallery-main img{width:100%;height:100%;object-fit:cover;display:block}
.sw-thumbs{display:flex;gap:10px;overflow-x:auto;margin-top:12px}
.sw-thumbs img{height:76px;width:auto;border-radius:12px;cursor:pointer;border:2px solid transparent;display:block}
.sw-thumbs img.on{border-color:var(--saf)}
.sw-detail-title{font-size:clamp(28px,4vw,40px);font-weight:800;margin:12px 0 4px!important}
.sw-detail-sub{margin:0 0 14px;color:var(--muted);font-weight:600}
.sw-detail-meta{display:flex;flex-wrap:wrap;gap:8px 18px;list-style:none;padding:0;margin:0 0 18px;font-weight:600;color:var(--muted)}
.sw-detail-meta li{display:inline-flex;align-items:center;gap:7px}
.sw-rates{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px}
.sw-rate{border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:2px}
.sw-rate span{font-size:13px;color:var(--muted);font-weight:600}
.sw-rate b{font-size:16px}
.sw-info{border:1px solid var(--line);border-radius:18px;padding:18px;margin-top:14px}
.sw-info h3{font-size:18px;font-weight:800;margin-bottom:8px}
.sw-info p{margin:0;color:var(--muted);font-size:15px}
.sw-info ul{margin:0;padding-left:20px;color:var(--muted);font-size:15px;display:grid;gap:4px}
.sw-zoom{position:fixed;inset:0;z-index:99;background:rgba(2,6,23,.92);display:grid;place-items:center;cursor:zoom-out}
.sw-zoom img{max-width:94%;max-height:90%;display:block}

.sw-stats{background:var(--ink);color:#fff;padding:64px 0}
.sw-stat-row{display:grid;grid-template-columns:repeat(5,1fr);gap:0}
.sw-stat{padding:6px 22px;border-left:1px solid rgba(255,255,255,.16);display:flex;flex-direction:column;gap:4px}
.sw-stat:first-child{border-left:0;padding-left:0}
.sw-stat span{font-size:13.5px;color:#9fb3c0;font-weight:600}
.sw-stat strong{font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(30px,4vw,46px);font-weight:800;color:var(--saf2);line-height:1.05}
.sw-stat em{font-style:normal;font-size:13px;color:#c8d6de}

.sw-why{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.sw-why-card{padding:24px;border-radius:20px;border:1px solid var(--line);background:#fff;transition:border-color .2s,transform .25s}
.sw-why-card:hover{border-color:var(--pea);transform:translateY(-4px)}
.sw-why-card span{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:var(--mist);color:var(--pea);margin-bottom:16px;transition:background .25s,color .25s}
.sw-why-card:hover span{background:var(--pea);color:#fff}
.sw-why-card h3{font-size:19px;font-weight:800;margin-bottom:8px}
.sw-why-card p{margin:0;color:var(--muted);font-size:15px}

.sw-faq-wrap{max-width:820px}
.sw-faq-item{background:#fff;border:1px solid var(--line);border-radius:16px;margin-bottom:10px;overflow:hidden;transition:border-color .2s}
.sw-faq-item.open{border-color:var(--pea)}
.sw-faq-item button{width:100%;display:flex;justify-content:space-between;align-items:center;gap:14px;text-align:left;background:none;border:0;padding:18px 20px;font-weight:700;font-size:16.5px;color:var(--ink)}
.sw-faq-item svg{flex-shrink:0;color:var(--pea);transition:transform .3s}
.sw-faq-item.open svg{transform:rotate(180deg)}
.sw-faq-body{display:grid;grid-template-rows:0fr;transition:grid-template-rows .32s ease}
.sw-faq-item.open .sw-faq-body{grid-template-rows:1fr}
.sw-faq-body p{overflow:hidden;margin:0;padding:0 20px;color:var(--muted);font-size:15.5px}
.sw-faq-item.open .sw-faq-body p{padding-bottom:18px}

.sw-callback{background:linear-gradient(160deg,#0a4a55,#0e7c86);color:#fff;padding:64px 0}
.sw-callback-in{display:grid;grid-template-columns:1.1fr 1fr;gap:36px;align-items:center}
.sw-callback h2{margin-bottom:10px}
.sw-callback p{margin:0 0 18px;color:#d3eef0;font-size:17px}
.sw-callback-links{display:flex;gap:18px;flex-wrap:wrap;font-weight:700}
.sw-callback-links a{display:inline-flex;align-items:center;gap:7px}
.sw-callback form{display:grid;gap:12px;background:#fff;padding:22px;border-radius:20px}
.sw-callback input{height:48px;border:1.5px solid var(--line);border-radius:12px;padding:0 14px;font:inherit;font-size:15px;color:var(--ink);background:#fff}
.sw-callback input:focus{outline:0;border-color:var(--pea);box-shadow:0 0 0 4px rgba(14,124,134,.14)}
.sw-callback small{color:#b42318;font-weight:600}
.sw-thanks{display:flex;align-items:center;gap:14px;background:#fff;color:#117a4a;padding:26px;border-radius:20px;animation:swpop .45s cubic-bezier(.2,1.4,.4,1)}
@keyframes swpop{from{transform:scale(.9);opacity:0}}

.sw-visit{display:grid;grid-template-columns:1fr 1.4fr;gap:32px;align-items:center}
.sw-visit h2{margin-bottom:10px}
.sw-visit-text{margin:0 0 18px;color:var(--muted);font-size:16px}
.sw-map{border-radius:20px;overflow:hidden;border:1px solid var(--line)}
.sw-map iframe{display:block}

.sw-footer{background:#07131d;color:#b7c6d0;padding:56px 0 24px}
.sw-footer-in{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:28px}
.sw-footer h4{color:#fff;font-size:16px;margin-bottom:12px}
.sw-footer a,.sw-footer span{display:block;font-size:15px;margin-bottom:8px;color:#b7c6d0}
.sw-footer a:hover{color:var(--saf2)}
.sw-footer p{margin:14px 0 0;font-size:15px}
.sw-copy{margin-top:34px;padding-top:20px;border-top:1px solid rgba(255,255,255,.1);font-size:13px}

.sw-wa{position:fixed;right:12px;bottom:66px;z-index:70;width:56px;height:56px;border-radius:50%;background:#1a9d6c;color:#fff!important;display:grid;place-items:center;box-shadow:0 12px 24px -8px rgba(15,107,82,.7)}
.sw-wa::before{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #1a9d6c;animation:swping 2.4s ease-out infinite}
@keyframes swping{to{transform:scale(1.7);opacity:0}}

@media (max-width:1000px){
 .sw-search{grid-template-columns:repeat(3,1fr)}
 .sw-search-btn{grid-column:1/-1}
 .sw-plans{grid-template-columns:repeat(3,1fr)}
 .sw-why{grid-template-columns:repeat(2,1fr)}
 .sw-stat-row{grid-template-columns:repeat(3,1fr);row-gap:26px}
 .sw-stat:nth-child(4){border-left:0;padding-left:0}
 .sw-footer-in{grid-template-columns:1fr 1fr}
 .sw-detail-grid,.sw-visit{grid-template-columns:1fr}
}
@media (max-width:760px){
 .sw-nav{position:absolute;top:68px;left:0;right:0;background:#fff;flex-direction:column;gap:0;padding:8px 20px 16px;border-bottom:1px solid var(--line);display:none}
 .sw-nav.open{display:flex}
 .sw-nav a{padding:12px 0;border-bottom:1px solid var(--line)}
 .sw-burger{display:block}
 .sw-section{padding:52px 0}
 .sw-hero{padding:44px 0 190px}
 .sw-search{grid-template-columns:1fr 1fr;margin-top:-84px;margin-left:12px;margin-right:12px;width:auto}
 .sw-search label:first-child{grid-column:1/-1}
 .sw-plans{grid-auto-flow:column;grid-auto-columns:70%;grid-template-columns:none;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px}
 .sw-plan{scroll-snap-align:start}
 .sw-toolbar{grid-template-columns:1fr}
 .sw-why{grid-template-columns:1fr}
 .sw-stat-row{grid-template-columns:1fr 1fr}
 .sw-stat{border-left:0;padding-left:0}
 .sw-callback-in{grid-template-columns:1fr}
}
@media (max-width:480px){.sw-call{display:none}}
@media (prefers-reduced-motion:reduce){
 .sw *,.sw *::before,.sw *::after{animation:none!important;transition:none!important}
 .sw-hero h1 span,.sw-hero p,.sw-hero-points{opacity:1;transform:none}
 .sw-car-wrap{left:40%}
}
`;

/* =========================================================
   ADMIN (passcode gate + panel)
========================================================= */

const ADMIN_SESSION_KEY = "sawariya_admin_ok";

const snake = (k) => k.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
const val = (o, k) => {
  if (!o) return "";
  for (const key of [k, snake(k)]) {
    const v = o[key];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
};
const num = (o, k) => Number(val(o, k)) || 0;
const money = (v) => (v === "" ? "" : fmtINR(v));
const labelize = (k) =>
  String(k).replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
const when = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d)
    ? String(v)
    : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const waLink = (p) => `https://wa.me/${withCode(p)}`;
const telLink = (p) => `tel:+${withCode(p)}`;
const ts = (o) => new Date(val(o, "createdAt") || 0).getTime() || 0;

function downloadCSV(name, columns, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    columns.map((c) => esc(c[0])).join(","),
    ...rows.map((r) => columns.map((c) => esc(c[1](r))).join(",")),
  ].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Facts({ title, items }) {
  const shown = items.filter(([, v]) => v !== "" && v !== undefined && v !== null);
  if (!shown.length) return null;
  return (
    <div className="ad-facts">
      <h4>{title}</h4>
      <dl>
        {shown.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RawTable({ obj }) {
  const rows = Object.entries(obj || {}).filter(([k]) => k !== "photos");
  return (
    <table className="ad-raw">
      <tbody>
        {rows.map(([k, v]) => {
          let t = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
          if (t.length > 160) t = t.slice(0, 160) + "…";
          return (
            <tr key={k}>
              <th>{labelize(k)}</th>
              <td>{t || "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function AdField({ label, hint, children, wide }) {
  return (
    <label className={`ad-f ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <em>{hint}</em>}
    </label>
  );
}

/* ---------------- dashboard ---------------- */
function DashboardTab({ cars, bookings, leads, go }) {
  const free = cars.filter((c) => c.available).length;
  const revenue = bookings.reduce((a, b) => a + num(b, "paidAmount"), 0);
  const balance = bookings.reduce((a, b) => a + num(b, "remainingAmount"), 0);
  const recentB = [...bookings].sort((a, b) => ts(b) - ts(a)).slice(0, 5);
  const recentL = [...leads].sort((a, b) => ts(b) - ts(a)).slice(0, 5);
  const cards = [
    ["Cars", cars.length, `${free} available, ${cars.length - free} rented`, "cars"],
    ["Bookings", bookings.length, "all time", "bookings"],
    ["Leads", leads.length, "callback and form numbers", "leads"],
    ["Paid so far", fmtINR(revenue), "advance and full payments", "bookings"],
    ["Balance to collect", fmtINR(balance), "remaining on bookings", "bookings"],
  ];
  return (
    <>
      <div className="ad-cards">
        {cards.map(([t, v, n, tab]) => (
          <button key={t} className="ad-card" onClick={() => go(tab)}>
            <span>{t}</span>
            <strong>{v}</strong>
            <em>{n}</em>
          </button>
        ))}
      </div>
      <div className="ad-two">
        <section className="ad-box">
          <h3>Latest bookings</h3>
          {recentB.length === 0 && <p className="ad-muted">No bookings yet.</p>}
          {recentB.map((b, i) => (
            <div key={val(b, "id") || i} className="ad-line">
              <b>{val(b, "carName") || "Car"}</b>
              <span>
                {val(b, "name")} {val(b, "pickupDate")}
              </span>
              <strong>{money(val(b, "total"))}</strong>
            </div>
          ))}
        </section>
        <section className="ad-box">
          <h3>Latest leads</h3>
          {recentL.length === 0 && <p className="ad-muted">No leads yet.</p>}
          {recentL.map((l, i) => (
            <div key={val(l, "id") || i} className="ad-line">
              <b>{val(l, "phone")}</b>
              <span>{[val(l, "name"), val(l, "city")].filter(Boolean).join(", ")}</span>
              <a href={telLink(val(l, "phone"))}>Call</a>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

/* ---------------- cars ---------------- */
const NUM_KEYS = [
  "dailyRate",
  "hourlyRate",
  "price12",
  "weeklyRate",
  "monthlyRate",
  "longTermRate",
  "hourlyKm",
  "dailyKm",
  "extraKmRate",
  "driverCost",
  "fuelCostPerKm",
  "securityDeposit",
];

function blankCar(cities) {
  const f = {
    name: "",
    type: "Hatchback",
    city: cities[0]?.name || "",
    fuel: "Petrol",
    transmission: "Manual",
    seats: 5,
    available: true,
    photos: [],
  };
  NUM_KEYS.forEach((k) => (f[k] = ""));
  return f;
}
function carToForm(car, cities) {
  const f = { ...blankCar(cities), ...car, photos: [...(car.photos || [])] };
  f.dailyRate = car.dailyRate ?? car.price24 ?? "";
  f.hourlyRate = car.hourlyRate ?? car.price8 ?? "";
  f.price12 = car.price12 ?? "";
  NUM_KEYS.forEach((k) => {
    if (f[k] === undefined || f[k] === null) f[k] = "";
  });
  return f;
}

function CarsTab({ cars, setCars, cities }) {
  const [editing, setEditing] = useState(null); // null | "new" | car id
  const [form, setForm] = useState(() => blankCar(cities));
  const [busy, setBusy] = useState("");
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function startNew() {
    setForm(blankCar(cities));
    setEditing("new");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function startEdit(car) {
    setForm(carToForm(car, cities));
    setEditing(car.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancel() {
    setEditing(null);
    setBusy("");
  }

  async function addPhotos(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) return;
    setBusy("Preparing photos");
    try {
      const out = [];
      for (const f of files) out.push(await compressImage(f));
      setForm((p) => ({ ...p, photos: [...(p.photos || []), ...out].slice(0, 10) }));
    } catch (err) {
      console.error(err);
      alert("One of the photos could not be read. Try a different image.");
    }
    setBusy("");
  }
  const removePhoto = (i) => setForm((p) => ({ ...p, photos: p.photos.filter((_, x) => x !== i) }));
  const makeMain = (i) =>
    setForm((p) => ({ ...p, photos: [p.photos[i], ...p.photos.filter((_, x) => x !== i)] }));

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) return alert("Enter the car name.");
    if (!form.city) return alert("Choose a city. Add one in the Cities tab if the list is empty.");
    if (!(Number(form.dailyRate) > 0)) return alert("Enter the daily price.");

    const existing = editing && editing !== "new" ? cars.find((c) => c.id === editing) : null;
    const data = {
      ...(existing || {}),
      name: form.name.trim(),
      type: String(form.type || "").trim() || "Hatchback",
      city: form.city,
      fuel: form.fuel,
      transmission: form.transmission,
      seats: Number(form.seats) || 5,
      available: !!form.available,
    };
    NUM_KEYS.forEach((k) => {
      const v = form[k];
      if (v !== "" && v !== null && !isNaN(Number(v))) data[k] = Number(v);
      else delete data[k];
    });
    data.price24 = data.dailyRate;
    if (data.hourlyRate !== undefined) data.price8 = data.hourlyRate;
    else delete data.price8;
    if (existing) data.id = existing.id;
    else delete data.id;

    setBusy("Saving car");
    try {
      const photos = [];
      for (const p of form.photos || []) {
        photos.push(typeof p === "string" && p.startsWith("data:") ? await uploadPhoto(p) : p);
      }
      data.photos = photos;
      const cloudId = await upsertCar(data);
      if (cloudId) data.id = cloudId;
      if (!data.id) data.id = uid("car");
    } catch (err) {
      console.error(err);
      setBusy("");
      return alert("Could not save the car: " + (err?.message || err));
    }
    setCars((prev) =>
      existing ? prev.map((c) => (c.id === existing.id ? { ...c, ...data } : c)) : [...prev, data]
    );
    setBusy("");
    setEditing(null);
  }

  async function toggle(car) {
    const updated = { ...car, available: !car.available };
    setCars((prev) => prev.map((c) => (c.id === car.id ? updated : c)));
    try {
      await upsertCar(updated);
    } catch (err) {
      console.error(err);
      alert("Changed on this screen, but the cloud save failed: " + (err?.message || err));
    }
  }
  async function remove(car) {
    if (!window.confirm(`Delete ${car.name}? This cannot be undone.`)) return;
    try {
      await deleteCarCloud(car.id);
    } catch (err) {
      console.error(err);
      return alert("Could not delete: " + (err?.message || err));
    }
    setCars((prev) => prev.filter((c) => c.id !== car.id));
  }

  return (
    <>
      <div className="ad-head">
        <h2>Cars ({cars.length})</h2>
        {editing === null && (
          <button className="ad-btn pri" onClick={startNew}>
            <Plus size={17} /> Add car
          </button>
        )}
      </div>

      {editing !== null && (
        <form className="ad-box ad-form" onSubmit={save}>
          <div className="ad-head">
            <h3>{editing === "new" ? "Add a car" : `Edit ${form.name || "car"}`}</h3>
            <button type="button" className="ad-x" onClick={cancel} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="ad-grid">
            <AdField label="Car name" wide>
              <input value={form.name} onChange={set("name")} placeholder="Maruti Baleno CNG" />
            </AdField>
            <AdField label="Type">
              <input list="ad-types" value={form.type} onChange={set("type")} />
              <datalist id="ad-types">
                {["Hatchback", "Sedan", "SUV", "MUV", "Luxury"].map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </AdField>
            <AdField label="City">
              <select value={form.city} onChange={set("city")}>
                <option value="">Select city</option>
                {cities.map((c) => (
                  <option key={c.id || c.name}>{c.name}</option>
                ))}
              </select>
            </AdField>
            <AdField label="Fuel">
              <select value={form.fuel} onChange={set("fuel")}>
                {["Petrol", "Diesel", "CNG", "Electric"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </AdField>
            <AdField label="Transmission">
              <select value={form.transmission} onChange={set("transmission")}>
                {["Manual", "Automatic"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </AdField>
            <AdField label="Seats">
              <input type="number" min="2" max="12" value={form.seats} onChange={set("seats")} />
            </AdField>
            <AdField label="Status">
              <select
                value={form.available ? "yes" : "no"}
                onChange={(e) => setForm((p) => ({ ...p, available: e.target.value === "yes" }))}
              >
                <option value="yes">Available</option>
                <option value="no">Rented out</option>
              </select>
            </AdField>
          </div>

          <h4 className="ad-sub">Prices</h4>
          <div className="ad-grid">
            <AdField label="Daily price (₹) *">
              <input type="number" min="0" value={form.dailyRate} onChange={set("dailyRate")} />
            </AdField>
            <AdField label="Hourly price (₹ per hour)" hint="Blank uses the default">
              <input type="number" min="0" value={form.hourlyRate} onChange={set("hourlyRate")} />
            </AdField>
            <AdField label="12 hour price (₹)">
              <input type="number" min="0" value={form.price12} onChange={set("price12")} />
            </AdField>
            <AdField label="Weekly price (₹)" hint="Blank uses the default">
              <input type="number" min="0" value={form.weeklyRate} onChange={set("weeklyRate")} />
            </AdField>
            <AdField label="Monthly price (₹)" hint="Blank uses the default">
              <input type="number" min="0" value={form.monthlyRate} onChange={set("monthlyRate")} />
            </AdField>
            <AdField label="2-year plan (₹ per month)" hint="Blank uses the default">
              <input type="number" min="0" value={form.longTermRate} onChange={set("longTermRate")} />
            </AdField>
            <AdField label="Included km per hour">
              <input type="number" min="0" value={form.hourlyKm} onChange={set("hourlyKm")} />
            </AdField>
            <AdField label="Included km per day">
              <input type="number" min="0" value={form.dailyKm} onChange={set("dailyKm")} />
            </AdField>
            <AdField label="Extra km rate (₹ per km)">
              <input type="number" min="0" value={form.extraKmRate} onChange={set("extraKmRate")} />
            </AdField>
            <AdField label="Driver cost (₹ per day)">
              <input type="number" min="0" value={form.driverCost} onChange={set("driverCost")} />
            </AdField>
            <AdField label="Fuel cost (₹ per km)">
              <input type="number" min="0" step="0.01" value={form.fuelCostPerKm} onChange={set("fuelCostPerKm")} />
            </AdField>
            <AdField label="Security deposit (₹)" hint="Only you see this">
              <input type="number" min="0" value={form.securityDeposit} onChange={set("securityDeposit")} />
            </AdField>
          </div>

          <h4 className="ad-sub">Photos ({(form.photos || []).length}/10)</h4>
          <div className="ad-photos">
            {(form.photos || []).map((p, i) => (
              <div key={i} className="ad-photo">
                <img src={p} alt="" />
                {i === 0 && <span className="ad-main">Main</span>}
                <div>
                  {i > 0 && (
                    <button type="button" onClick={() => makeMain(i)}>
                      Make main
                    </button>
                  )}
                  <button type="button" onClick={() => removePhoto(i)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {(form.photos || []).length < 10 && (
              <label className="ad-add-photo">
                <ImagePlus size={26} />
                <span>Add photos</span>
                <input type="file" accept="image/*" multiple hidden onChange={addPhotos} />
              </label>
            )}
          </div>

          <div className="ad-actions">
            <button className="ad-btn pri" disabled={!!busy}>
              {busy || (editing === "new" ? "Save car" : "Save changes")}
            </button>
            <button type="button" className="ad-btn" onClick={cancel} disabled={!!busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {cars.length === 0 && editing === null && (
        <div className="ad-empty">
          <Car size={38} strokeWidth={1.3} />
          <p>No cars yet. Tap Add car to list your first one.</p>
        </div>
      )}
      <div className="ad-list">
        {cars.map((car) => (
          <div key={car.id} className="ad-row">
            <div className="ad-thumb">
              {car.photos?.[0] ? <img src={car.photos[0]} alt="" /> : <Car size={30} strokeWidth={1.3} />}
            </div>
            <div className="ad-row-main">
              <b>{car.name}</b>
              <span>
                {[car.city, car.type, car.fuel, car.transmission, `${car.seats || 5} seats`].filter(Boolean).join(", ")}
              </span>
              <span>
                {fmtINR(Number(car.dailyRate ?? car.price24 ?? 0))} per day, {(car.photos || []).length} photos
              </span>
            </div>
            <div className="ad-row-actions">
              <button className={`ad-chip ${car.available ? "ok" : "no"}`} onClick={() => toggle(car)} title="Tap to change">
                {car.available ? "Available" : "Rented out"}
              </button>
              <button className="ad-icon" onClick={() => startEdit(car)} aria-label="Edit">
                <Pencil size={17} />
              </button>
              <button className="ad-icon danger" onClick={() => remove(car)} aria-label="Delete">
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- bookings ---------------- */
function BookingCard({ b }) {
  const [open, setOpen] = useState(false);
  const status = val(b, "status") || "Pending";
  const remaining = num(b, "remainingAmount");
  const phone = val(b, "phone");
  const duration = val(b, "rentalDuration");
  return (
    <article className="ad-bk">
      <div className="ad-bk-top" onClick={() => setOpen((v) => !v)}>
        <div>
          <b>{val(b, "carName") || "Car"}</b>
          <span>
            {val(b, "name") || "Customer"}, {phone}
          </span>
          <span>
            Pickup {val(b, "pickupDate")} {val(b, "pickupTime")}, plan {val(b, "plan") || (duration ? `${duration} hours` : "")}
          </span>
        </div>
        <div className="ad-bk-money">
          <strong>{money(val(b, "total"))}</strong>
          <span className="paid">Paid {money(num(b, "paidAmount"))}</span>
          {remaining > 0 && <span className="due">Due {fmtINR(remaining)}</span>}
          <em className={`ad-status ${String(status).toLowerCase()}`}>{status}</em>
        </div>
      </div>
      <div className="ad-bk-actions">
        <a href={telLink(phone)}>Call</a>
        <a href={waLink(phone)} target="_blank" rel="noreferrer">WhatsApp</a>
        {val(b, "email") && <a href={`mailto:${val(b, "email")}`}>Email</a>}
        <button onClick={() => setOpen((v) => !v)}>{open ? "Hide details" : "Full details"}</button>
      </div>
      {open && (
        <div className="ad-bk-detail">
          <Facts
            title="Customer"
            items={[
              ["Name", val(b, "name")],
              ["Mobile", phone],
              ["Email", val(b, "email")],
            ]}
          />
          <Facts
            title="Trip"
            items={[
              ["Car", val(b, "carName")],
              ["Pickup city", val(b, "city")],
              ["Pickup date", val(b, "pickupDate")],
              ["Pickup time", val(b, "pickupTime")],
              ["Plan", val(b, "plan")],
              ["Rental hours", duration],
              ["Trip type", val(b, "tripType")],
              ["Service", val(b, "serviceType")],
              ["Fuel option", val(b, "fuelOption")],
              ["Destination", val(b, "dropCity")],
              ["Distance (km)", val(b, "estimatedDistanceKm")],
              ["Drive hours", val(b, "estimatedDriveHours")],
            ]}
          />
          <Facts
            title="Price and payment"
            items={[
              ["Rental", money(val(b, "rental"))],
              ["Extra km", money(val(b, "extraKmCost"))],
              ["Fuel", money(val(b, "fuelCost"))],
              ["Driver", money(val(b, "driverCost"))],
              ["Guide", money(val(b, "guideCost"))],
              ["Recovery fuel", money(val(b, "recoveryFuel"))],
              ["Recovery time", money(val(b, "recoveryTime"))],
              ["Home delivery", money(val(b, "deliveryCost"))],
              ["Margin", money(val(b, "margin"))],
              ["Total", money(val(b, "total"))],
              ["Paid", money(val(b, "paidAmount"))],
              ["Advance paid", money(val(b, "advancePaid"))],
              ["Remaining", money(val(b, "remainingAmount"))],
              ["Payment type", val(b, "paymentType")],
              ["Payment ID", val(b, "paymentId")],
              ["Order ID", val(b, "orderId")],
              ["Status", status],
            ]}
          />
          <Facts
            title="Record"
            items={[
              ["Booking ID", val(b, "id")],
              ["Created", when(val(b, "createdAt"))],
            ]}
          />
          <details className="ad-all">
            <summary>Everything stored for this booking</summary>
            <RawTable obj={b} />
          </details>
        </div>
      )}
    </article>
  );
}

function BookingsTab({ bookings, onRefresh }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...bookings]
      .sort((a, b) => ts(b) - ts(a))
      .filter(
        (b) =>
          !t ||
          [val(b, "name"), val(b, "phone"), val(b, "carName"), val(b, "email"), val(b, "paymentId")]
            .join(" ")
            .toLowerCase()
            .includes(t)
      );
  }, [bookings, q]);
  function exportCSV() {
    downloadCSV(
      "bookings.csv",
      [
        ["Created", (b) => when(val(b, "createdAt"))],
        ["Car", (b) => val(b, "carName")],
        ["Name", (b) => val(b, "name")],
        ["Mobile", (b) => val(b, "phone")],
        ["Email", (b) => val(b, "email")],
        ["City", (b) => val(b, "city")],
        ["Pickup date", (b) => val(b, "pickupDate")],
        ["Pickup time", (b) => val(b, "pickupTime")],
        ["Plan", (b) => val(b, "plan")],
        ["Trip type", (b) => val(b, "tripType")],
        ["Service", (b) => val(b, "serviceType")],
        ["Destination", (b) => val(b, "dropCity")],
        ["Total", (b) => val(b, "total")],
        ["Paid", (b) => val(b, "paidAmount")],
        ["Remaining", (b) => val(b, "remainingAmount")],
        ["Payment type", (b) => val(b, "paymentType")],
        ["Payment ID", (b) => val(b, "paymentId")],
        ["Status", (b) => val(b, "status")],
      ],
      list
    );
  }
  return (
    <>
      <div className="ad-head">
        <h2>Bookings ({bookings.length})</h2>
        <div className="ad-actions tight">
          <button className="ad-btn" onClick={onRefresh}>Refresh</button>
          <button className="ad-btn" onClick={exportCSV} disabled={!list.length}>Download CSV</button>
        </div>
      </div>
      <div className="ad-search">
        <Search size={17} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, mobile, car or payment ID" />
      </div>
      {list.length === 0 ? (
        <div className="ad-empty"><p>No bookings to show.</p></div>
      ) : (
        <div className="ad-list">
          {list.map((b, i) => (
            <BookingCard key={val(b, "id") || i} b={b} />
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- leads ---------------- */
function LeadCard({ l }) {
  const [open, setOpen] = useState(false);
  const phone = val(l, "phone");
  return (
    <article className="ad-bk">
      <div className="ad-bk-top" onClick={() => setOpen((v) => !v)}>
        <div>
          <b>{phone}</b>
          <span>{[val(l, "name"), val(l, "city")].filter(Boolean).join(", ") || "No name"}</span>
          {val(l, "carName") && <span>Interested in {val(l, "carName")}</span>}
        </div>
        <div className="ad-bk-money">
          <span>{when(val(l, "createdAt"))}</span>
        </div>
      </div>
      <div className="ad-bk-actions">
        <a href={telLink(phone)}>Call</a>
        <a href={waLink(phone)} target="_blank" rel="noreferrer">WhatsApp</a>
        <button onClick={() => setOpen((v) => !v)}>{open ? "Hide details" : "Full details"}</button>
      </div>
      {open && (
        <div className="ad-bk-detail">
          <Facts
            title="Lead"
            items={[
              ["Name", val(l, "name")],
              ["Mobile", phone],
              ["City", val(l, "city")],
              ["Car", val(l, "carName")],
              ["Message", val(l, "message")],
              ["Received", when(val(l, "createdAt"))],
              ["Lead ID", val(l, "id")],
            ]}
          />
          <details className="ad-all">
            <summary>Everything stored for this lead</summary>
            <RawTable obj={l} />
          </details>
        </div>
      )}
    </article>
  );
}

function LeadsTab({ leads, onRefresh }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...leads]
      .sort((a, b) => ts(b) - ts(a))
      .filter(
        (l) =>
          !t ||
          [val(l, "name"), val(l, "phone"), val(l, "city"), val(l, "carName"), val(l, "message")]
            .join(" ")
            .toLowerCase()
            .includes(t)
      );
  }, [leads, q]);
  function exportCSV() {
    downloadCSV(
      "leads.csv",
      [
        ["Received", (l) => when(val(l, "createdAt"))],
        ["Name", (l) => val(l, "name")],
        ["Mobile", (l) => val(l, "phone")],
        ["City", (l) => val(l, "city")],
        ["Car", (l) => val(l, "carName")],
        ["Message", (l) => val(l, "message")],
      ],
      list
    );
  }
  return (
    <>
      <div className="ad-head">
        <h2>Leads ({leads.length})</h2>
        <div className="ad-actions tight">
          <button className="ad-btn" onClick={onRefresh}>Refresh</button>
          <button className="ad-btn" onClick={exportCSV} disabled={!list.length}>Download CSV</button>
        </div>
      </div>
      <div className="ad-search">
        <Search size={17} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, mobile, city or car" />
      </div>
      {list.length === 0 ? (
        <div className="ad-empty"><p>No leads yet. Numbers from the booking form and the callback form land here.</p></div>
      ) : (
        <div className="ad-list">
          {list.map((l, i) => (
            <LeadCard key={val(l, "id") || i} l={l} />
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- cities ---------------- */
function CitiesTab({ cities, setCities }) {
  const [name, setName] = useState("");
  async function add(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (cities.some((c) => c.name.toLowerCase() === n.toLowerCase())) return alert("That city is already in the list.");
    try {
      await upsertCity({ name: n, active: true });
    } catch (err) {
      return alert("Could not save the city: " + (err?.message || err));
    }
    setCities((prev) => [...prev, { id: uid("city"), name: n, active: true }]);
    setName("");
  }
  async function toggle(c) {
    const next = { ...c, active: !c.active };
    setCities((prev) => prev.map((x) => (x.name === c.name ? next : x)));
    try {
      await upsertCity({ name: c.name, active: next.active });
    } catch (err) {
      console.error(err);
      alert("Changed on this screen, but the cloud save failed: " + (err?.message || err));
    }
  }
  return (
    <>
      <div className="ad-head"><h2>Cities</h2></div>
      <form className="ad-box ad-inline" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New city name" />
        <button className="ad-btn pri"><Plus size={17} /> Add city</button>
      </form>
      <div className="ad-list">
        {cities.map((c) => (
          <div key={c.id || c.name} className="ad-row">
            <div className="ad-row-main">
              <b>{c.name}</b>
              <span>{c.active ? "Shown on the website" : "Hidden from the website"}</span>
            </div>
            <div className="ad-row-actions">
              <button className={`ad-chip ${c.active ? "ok" : "no"}`} onClick={() => toggle(c)}>
                {c.active ? "Active" : "Hidden"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- site content ---------------- */
const SETTING_FIELDS = [
  ["hourlyStartingPrice", "Hourly starting price (₹ per hour)"],
  ["hourlyIncludedKm", "Included km per hour"],
  ["dailyStartingPrice", "Daily starting price (₹)"],
  ["dailyIncludedKm", "Included km per day"],
  ["weeklyStartingPrice", "Weekly starting price (₹)"],
  ["monthlyStartingPrice", "1-month price (₹)"],
  ["longTermMonthlyPrice", "2-year plan (₹ per month)"],
  ["longTermMonths", "2-year plan months"],
  ["extraKmRate", "Extra km rate (₹ per km)"],
  ["driverCostPerDay", "Driver cost (₹ per day)"],
  ["guideCostPerDay", "Guide cost (₹ per day)"],
  ["cngCostPerKm", "CNG cost (₹ per km)"],
  ["dieselCostPerKm", "Diesel cost (₹ per km)"],
  ["petrolCostPerKm", "Petrol cost (₹ per km)"],
  ["returnTimeCostPerHour", "Recovery time cost (₹ per hour)"],
  ["deliveryFlatCharge", "Home delivery charge (₹)"],
  ["marginPercent", "Business margin (%)"],
  ["bookingAdvance", "Booking advance (₹)"],
];

function ContentTab() {
  const [section, setSection] = useState("places");
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_BUSINESS_SETTINGS,
    ...(loadShared("sawariya_business_settings", DEFAULT_BUSINESS_SETTINGS) || {}),
  }));
  const [packages, setPackages] = useState(() => {
    const p = loadShared("sawariya_travel_packages", DEFAULT_TRAVEL_PACKAGES);
    return Array.isArray(p) ? p : DEFAULT_TRAVEL_PACKAGES;
  });
  const [decor, setDecor] = useState(() => {
    const d = loadShared("sawariya_decorations", DEFAULT_DECORATIONS);
    return Array.isArray(d) ? d : DEFAULT_DECORATIONS;
  });
  const [info, setInfo] = useState(() => ({
    ...SITE_DEFAULTS,
    ...(loadShared("sawariya_site_info", SITE_DEFAULTS) || {}),
  }));

  const upd = (setter, i, k, v) => setter((list) => list.map((x, n) => (n === i ? { ...x, [k]: v } : x)));
  const del = (setter, i) => setter((list) => list.filter((_, n) => n !== i));
  const saved = (what) => alert(`${what} saved on this device.`);

  const tabs = [
    ["places", "Places to visit"],
    ["decor", "Car decoration"],
    ["location", "Location and contact"],
    ["pricing", "Default pricing"],
  ];
  return (
    <>
      <div className="ad-head"><h2>Website content</h2></div>
      <div className="ad-subtabs">
        {tabs.map(([id, t]) => (
          <button key={id} className={section === id ? "on" : ""} onClick={() => setSection(id)}>
            {t}
          </button>
        ))}
      </div>

      {section === "places" && (
        <>
          <p className="ad-muted">Travel packages shown on the home page, such as Ujjain or Mandu.</p>
          {packages.map((p, i) => (
            <div key={p.id || i} className="ad-box">
              <div className="ad-grid">
                <AdField label="Place name"><input value={p.name || ""} onChange={(e) => upd(setPackages, i, "name", e.target.value)} /></AdField>
                <AdField label="Days"><input type="number" min="1" value={p.days ?? 1} onChange={(e) => upd(setPackages, i, "days", Number(e.target.value))} /></AdField>
                <AdField label="Self-drive price (₹)"><input type="number" min="0" value={p.selfDrivePrice ?? 0} onChange={(e) => upd(setPackages, i, "selfDrivePrice", Number(e.target.value))} /></AdField>
                <AdField label="With driver price (₹)"><input type="number" min="0" value={p.driverPrice ?? 0} onChange={(e) => upd(setPackages, i, "driverPrice", Number(e.target.value))} /></AdField>
                <AdField label="With guide price (₹)"><input type="number" min="0" value={p.guidePrice ?? 0} onChange={(e) => upd(setPackages, i, "guidePrice", Number(e.target.value))} /></AdField>
                <AdField label="Description" wide><textarea rows="2" value={p.description || ""} onChange={(e) => upd(setPackages, i, "description", e.target.value)} /></AdField>
              </div>
              <button className="ad-btn danger" onClick={() => del(setPackages, i)}><Trash2 size={16} /> Remove</button>
            </div>
          ))}
          <div className="ad-actions">
            <button className="ad-btn" onClick={() => setPackages((l) => [...l, { id: uid("pkg"), name: "", days: 1, description: "", selfDrivePrice: 0, driverPrice: 0, guidePrice: 0 }])}>
              <Plus size={16} /> Add place
            </button>
            <button className="ad-btn pri" onClick={() => { saveShared("sawariya_travel_packages", packages); saved("Places"); }}>Save places</button>
          </div>
        </>
      )}

      {section === "decor" && (
        <>
          <p className="ad-muted">Decoration options shown on the home page, such as birthday or wedding.</p>
          {decor.map((d, i) => (
            <div key={d.id || i} className="ad-box">
              <div className="ad-grid">
                <AdField label="Name"><input value={d.name || ""} onChange={(e) => upd(setDecor, i, "name", e.target.value)} /></AdField>
                <AdField label="Price (₹)" hint="0 shows Price on request"><input type="number" min="0" value={d.price ?? 0} onChange={(e) => upd(setDecor, i, "price", Number(e.target.value))} /></AdField>
                <AdField label="Description" wide><textarea rows="2" value={d.description || ""} onChange={(e) => upd(setDecor, i, "description", e.target.value)} /></AdField>
              </div>
              <button className="ad-btn danger" onClick={() => del(setDecor, i)}><Trash2 size={16} /> Remove</button>
            </div>
          ))}
          <div className="ad-actions">
            <button className="ad-btn" onClick={() => setDecor((l) => [...l, { id: uid("dec"), name: "", description: "", price: 0 }])}>
              <Plus size={16} /> Add decoration
            </button>
            <button className="ad-btn pri" onClick={() => { saveShared("sawariya_decorations", decor); saved("Decorations"); }}>Save decorations</button>
          </div>
        </>
      )}

      {section === "location" && (
        <div className="ad-box">
          <p className="ad-muted">Shown in the Visit us section, the header and the footer. WhatsApp number: country code plus number, for example 917415228011.</p>
          <div className="ad-grid">
            <AdField label="Address text" wide><input value={info.address} onChange={(e) => setInfo((p) => ({ ...p, address: e.target.value }))} /></AdField>
            <AdField label="Map latitude"><input value={info.lat} onChange={(e) => setInfo((p) => ({ ...p, lat: e.target.value }))} /></AdField>
            <AdField label="Map longitude"><input value={info.lng} onChange={(e) => setInfo((p) => ({ ...p, lng: e.target.value }))} /></AdField>
            <AdField label="Open in Maps link" wide><input value={info.mapsLink} onChange={(e) => setInfo((p) => ({ ...p, mapsLink: e.target.value }))} /></AdField>
            <AdField label="Phone 1"><input value={info.phone1} onChange={(e) => setInfo((p) => ({ ...p, phone1: e.target.value }))} /></AdField>
            <AdField label="Phone 2"><input value={info.phone2} onChange={(e) => setInfo((p) => ({ ...p, phone2: e.target.value }))} /></AdField>
            <AdField label="WhatsApp number"><input value={info.whatsapp} onChange={(e) => setInfo((p) => ({ ...p, whatsapp: e.target.value }))} /></AdField>
          </div>
          <div className="ad-actions">
            <button className="ad-btn pri" onClick={() => { saveShared("sawariya_site_info", info); saved("Location and contact"); }}>Save location</button>
            <button className="ad-btn" onClick={() => setInfo({ ...SITE_DEFAULTS })}>Reset to original</button>
          </div>
        </div>
      )}

      {section === "pricing" && (
        <div className="ad-box">
          <p className="ad-muted">Default prices used on the website and in the booking form. Prices set on a car override these.</p>
          <div className="ad-grid">
            {SETTING_FIELDS.map(([k, label]) => (
              <AdField key={k} label={label}>
                <input type="number" min="0" step="any" value={settings[k] ?? ""} onChange={(e) => setSettings((p) => ({ ...p, [k]: Number(e.target.value) }))} />
              </AdField>
            ))}
          </div>
          <div className="ad-actions">
            <button className="ad-btn pri" onClick={() => { saveShared("sawariya_business_settings", settings); saved("Pricing"); }}>Save pricing</button>
          </div>
        </div>
      )}

      <p className="ad-warn">
        Places, decorations, location and default pricing are stored in this browser only. Customers on other phones
        will not see changes until they are connected to your Supabase database.
      </p>
    </>
  );
}

/* ---------------- panel + gate ---------------- */
function AdminPanel({ cars, setCars, cities, setCities, bookings, leads, onRefresh, onExit, onLock }) {
  const [tab, setTab] = useState("dashboard");
  useEffect(() => {
    onRefresh();
    // eslint-disable-next-line
  }, []);
  const tabs = [
    ["dashboard", "Dashboard"],
    ["cars", "Cars"],
    ["bookings", "Bookings"],
    ["leads", "Leads"],
    ["cities", "Cities"],
    ["content", "Website content"],
  ];
  return (
    <div className="ad">
      <style>{ADMIN_CSS}</style>
      <header className="ad-top">
        <div className="ad-top-in">
          <Logo id="ad" />
          <b className="ad-badge">Admin</b>
          <div className="ad-top-actions">
            <button className="ad-btn" onClick={onExit}>View website</button>
            <button className="ad-btn" onClick={onLock}>Lock</button>
          </div>
        </div>
        <nav className="ad-tabs">
          {tabs.map(([id, t]) => (
            <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
              {t}
              {id === "leads" && leads.length > 0 && <i>{leads.length}</i>}
              {id === "bookings" && bookings.length > 0 && <i>{bookings.length}</i>}
            </button>
          ))}
        </nav>
      </header>
      <main className="ad-main">
        {tab === "dashboard" && <DashboardTab cars={cars} bookings={bookings} leads={leads} go={setTab} />}
        {tab === "cars" && <CarsTab cars={cars} setCars={setCars} cities={cities} />}
        {tab === "bookings" && <BookingsTab bookings={bookings} onRefresh={onRefresh} />}
        {tab === "leads" && <LeadsTab leads={leads} onRefresh={onRefresh} />}
        {tab === "cities" && <CitiesTab cities={cities} setCities={setCities} />}
        {tab === "content" && <ContentTab />}
      </main>
    </div>
  );
}

function AdminGate(props) {
  const [ok, setOk] = useState(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [tries, setTries] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);

  function submit(e) {
    e.preventDefault();
    if (Date.now() < lockUntil) {
      return setErr("Too many wrong tries. Wait 30 seconds and try again.");
    }
    if (code === ADMIN_PASSCODE) {
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      } catch {}
      setErr("");
      setCode("");
      setTries(0);
      setOk(true);
      return;
    }
    const n = tries + 1;
    setTries(n);
    setCode("");
    if (n >= 5) {
      setLockUntil(Date.now() + 30000);
      setTries(0);
      setErr("Too many wrong tries. Wait 30 seconds and try again.");
    } else {
      setErr("Wrong passcode.");
    }
  }
  function lock() {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {}
    setOk(false);
  }

  if (ok) return <AdminPanel {...props} onLock={lock} />;

  return (
    <div className="ad ad-gate">
      <style>{ADMIN_CSS}</style>
      <form className="ad-gate-card" onSubmit={submit}>
        <Logo id="gate" />
        <h2>Admin login</h2>
        <p>Enter the admin passcode to manage cars, bookings and leads.</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          autoComplete="off"
          placeholder="Passcode"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {err && <small>{err}</small>}
        <button className="ad-btn pri">Unlock</button>
        <button type="button" className="ad-btn" onClick={props.onExit}>Back to website</button>
      </form>
    </div>
  );
}

const ADMIN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Instrument+Sans:wght@400;500;600;700&display=swap');
.ad{--ink:#0b1b2b;--pea:#0e7c86;--pead:#0a5f67;--saf:#f59e0b;--mist:#f2f7f8;--line:#e0e9ec;--muted:#566774;--bad:#b42318;--good:#117a4a;
 font-family:'Instrument Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--ink);background:var(--mist);min-height:100vh;line-height:1.5}
.ad *{box-sizing:border-box}
.ad h2,.ad h3,.ad h4{font-family:'Bricolage Grotesque','Instrument Sans',sans-serif;margin:0;letter-spacing:-.02em}
.ad a{color:var(--pea);font-weight:700;text-decoration:none}
.ad button{font-family:inherit;cursor:pointer}
.ad :focus-visible{outline:3px solid var(--saf);outline-offset:2px}
.sw-logo{display:inline-flex;align-items:center;gap:10px}
.sw-logo-text{display:flex;flex-direction:column;line-height:1}
.sw-logo-text b{font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;letter-spacing:-.03em}
.sw-logo-text i{font-style:normal;font-size:11px;font-weight:600;color:var(--pea);margin-top:3px;letter-spacing:.14em}
.ad-top{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:30}
.ad-top-in{max-width:1100px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.ad-badge{background:var(--ink);color:#fff;border-radius:999px;padding:3px 12px;font-size:12px}
.ad-top-actions{margin-left:auto;display:flex;gap:8px}
.ad-tabs{max-width:1100px;margin:0 auto;padding:0 12px;display:flex;gap:4px;overflow-x:auto}
.ad-tabs button{background:none;border:0;border-bottom:3px solid transparent;padding:12px 14px;font-weight:700;font-size:15px;color:var(--muted);white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
.ad-tabs button.on{color:var(--ink);border-color:var(--saf)}
.ad-tabs i{font-style:normal;font-size:12px;background:var(--pea);color:#fff;border-radius:999px;padding:1px 8px}
.ad-main{max-width:1100px;margin:0 auto;padding:22px 16px 80px}
.ad-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.ad-head h2{font-size:26px;font-weight:800}
.ad-muted{color:var(--muted);font-size:14px;margin:0 0 14px}
.ad-warn{margin-top:22px;padding:12px 14px;border-radius:12px;background:#fff7e6;border:1px solid #f6d58b;color:#7a4b00;font-size:14px}
.ad-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1.5px solid var(--line);background:#fff;color:var(--ink);border-radius:11px;padding:0 16px;min-height:42px;font-weight:700;font-size:14.5px;transition:transform .15s,background .15s}
.ad-btn:hover:not(:disabled){transform:translateY(-1px);border-color:var(--pea)}
.ad-btn:disabled{opacity:.55;cursor:not-allowed}
.ad-btn.pri{background:var(--pea);border-color:var(--pea);color:#fff}
.ad-btn.pri:hover:not(:disabled){background:var(--pead)}
.ad-btn.danger{color:var(--bad);border-color:#f3c9c4;margin-top:6px}
.ad-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
.ad-actions.tight{margin:0}
.ad-x{background:none;border:0;color:var(--muted);padding:6px}
.ad-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:18px}
.ad-card{text-align:left;background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:2px;transition:border-color .2s,transform .2s}
.ad-card:hover{border-color:var(--pea);transform:translateY(-2px)}
.ad-card span{font-size:13px;color:var(--muted);font-weight:600}
.ad-card strong{font-family:'Bricolage Grotesque',sans-serif;font-size:28px;font-weight:800}
.ad-card em{font-style:normal;font-size:12.5px;color:var(--muted)}
.ad-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ad-box{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:14px}
.ad-box h3{font-size:18px;margin-bottom:10px}
.ad-line{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:9px 0;border-top:1px dashed var(--line);font-size:14px}
.ad-line span{color:var(--muted);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ad-form{border-color:var(--pea)}
.ad-sub{margin:22px 0 10px;font-size:16px}
.ad-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
.ad-f{display:flex;flex-direction:column;gap:5px}
.ad-f.wide{grid-column:1/-1}
.ad-f span{font-size:13px;font-weight:700;color:var(--muted)}
.ad-f em{font-style:normal;font-size:12px;color:var(--muted)}
.ad input,.ad select,.ad textarea{width:100%;font:inherit;font-size:15px;color:var(--ink);background:#fff;border:1.5px solid var(--line);border-radius:11px;padding:10px 12px;min-height:44px}
.ad textarea{resize:vertical}
.ad input:focus,.ad select:focus,.ad textarea:focus{outline:0;border-color:var(--pea);box-shadow:0 0 0 4px rgba(14,124,134,.14)}
.ad-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
.ad-photo{position:relative;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff}
.ad-photo img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.ad-photo div{display:flex;justify-content:space-between;gap:4px;padding:6px 8px}
.ad-photo button{background:none;border:0;color:var(--pea);font-weight:700;font-size:12.5px;padding:2px}
.ad-photo button:last-child{color:var(--bad);margin-left:auto}
.ad-main-tag,.ad-main{position:absolute;top:8px;left:8px;background:var(--saf);color:var(--ink);font-size:11px;font-weight:800;border-radius:999px;padding:2px 9px}
.ad-add-photo{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:2px dashed var(--line);border-radius:14px;min-height:120px;color:var(--pea);font-weight:700;font-size:14px;cursor:pointer;transition:border-color .2s,background .2s}
.ad-add-photo:hover{border-color:var(--pea);background:#f6fbfb}
.ad-list{display:grid;gap:10px}
.ad-row{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:12px}
.ad-thumb{width:96px;height:68px;border-radius:12px;background:linear-gradient(135deg,#d9eef0,#f6fafb);display:grid;place-items:center;color:var(--pea);overflow:hidden;flex-shrink:0}
.ad-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.ad-row-main{flex:1;min-width:0;display:flex;flex-direction:column}
.ad-row-main b{font-size:16px}
.ad-row-main span{font-size:13px;color:var(--muted)}
.ad-row-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.ad-chip{border:0;border-radius:999px;padding:6px 14px;font-weight:700;font-size:13px}
.ad-chip.ok{background:#e3f6ec;color:var(--good)}
.ad-chip.no{background:#fdeceb;color:var(--bad)}
.ad-icon{width:40px;height:40px;border-radius:11px;border:1.5px solid var(--line);background:#fff;color:var(--ink);display:grid;place-items:center}
.ad-icon:hover{border-color:var(--pea);color:var(--pea)}
.ad-icon.danger:hover{border-color:var(--bad);color:var(--bad)}
.ad-empty{background:#fff;border:1.5px dashed var(--line);border-radius:16px;padding:36px 16px;text-align:center;color:var(--muted)}
.ad-search{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:0 12px;margin-bottom:14px;color:var(--pea)}
.ad-search input{border:0;box-shadow:none!important;padding:10px 0}
.ad-bk{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden}
.ad-bk-top{display:flex;justify-content:space-between;gap:14px;padding:14px 16px;cursor:pointer}
.ad-bk-top>div:first-child{display:flex;flex-direction:column;min-width:0}
.ad-bk-top b{font-size:16px}
.ad-bk-top span{font-size:13px;color:var(--muted)}
.ad-bk-money{display:flex;flex-direction:column;align-items:flex-end;gap:1px;text-align:right}
.ad-bk-money strong{font-size:18px;font-family:'Bricolage Grotesque',sans-serif}
.ad-bk-money .paid{color:var(--good);font-weight:700}
.ad-bk-money .due{color:var(--bad);font-weight:700}
.ad-status{font-style:normal;font-size:12px;font-weight:700;border-radius:999px;padding:2px 10px;background:var(--mist);color:var(--muted);margin-top:4px}
.ad-status.confirmed{background:#e3f6ec;color:var(--good)}
.ad-bk-actions{display:flex;gap:16px;flex-wrap:wrap;padding:10px 16px;border-top:1px dashed var(--line);font-size:14px}
.ad-bk-actions button{background:none;border:0;color:var(--ink);font-weight:700;margin-left:auto;font-size:14px}
.ad-bk-detail{border-top:1px solid var(--line);padding:6px 16px 16px;background:#fbfdfd}
.ad-facts{margin-top:12px}
.ad-facts h4{font-size:15px;margin-bottom:6px}
.ad-facts dl{margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px 16px}
.ad-facts dt{font-size:12px;color:var(--muted);font-weight:600}
.ad-facts dd{margin:0;font-weight:700;font-size:14.5px;word-break:break-word}
.ad-all{margin-top:14px;font-size:14px}
.ad-all summary{cursor:pointer;font-weight:700;color:var(--pea)}
.ad-raw{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
.ad-raw th{text-align:left;color:var(--muted);font-weight:600;padding:5px 10px 5px 0;vertical-align:top;white-space:nowrap}
.ad-raw td{padding:5px 0;word-break:break-word}
.ad-raw tr{border-top:1px solid var(--line)}
.ad-inline{display:flex;gap:10px}
.ad-inline input{flex:1}
.ad-subtabs{display:flex;gap:8px;overflow-x:auto;margin-bottom:16px}
.ad-subtabs button{border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:8px 16px;font-weight:700;font-size:14px;white-space:nowrap;color:var(--ink)}
.ad-subtabs button.on{background:var(--ink);border-color:var(--ink);color:#fff}
.ad-gate{display:grid;place-items:center;padding:20px}
.ad-gate-card{width:100%;max-width:380px;background:#fff;border:1px solid var(--line);border-radius:22px;padding:28px;display:grid;gap:12px;box-shadow:0 30px 60px -30px rgba(11,27,43,.35)}
.ad-gate-card h2{font-size:26px;margin-top:8px}
.ad-gate-card p{margin:0;color:var(--muted);font-size:15px}
.ad-gate-card input{text-align:center;font-size:22px;letter-spacing:.4em}
.ad-gate-card small{color:var(--bad);font-weight:700}
@media (max-width:760px){
 .ad-two{grid-template-columns:1fr}
 .ad-row{flex-wrap:wrap}
 .ad-row-actions{width:100%;justify-content:flex-start}
 .ad-bk-top{flex-direction:column}
 .ad-bk-money{align-items:flex-start;text-align:left}
 .ad-inline{flex-direction:column}
}
`;

/* =========================================================
   MAIN APP
========================================================= */

function App() {
  const [cars, setCars] =
    useState(() =>
      loadCars()
    );

  const [cities, setCities] =
    useState(() =>
      loadShared(
        "sawariya_cities",
        seedCities
      )
    );

  const [bookings, setBookings] =
    useState(() =>
      loadShared(
        "sawariya_bookings",
        []
      )
    );

  const [leads, setLeads] = useState([]);

  const [isAdmin, setIsAdmin] =
    useState(false);

  /* -----------------------------------------------
     MOBILE / BODY FIX
  ------------------------------------------------ */

  useEffect(() => {
    document.body.style.margin =
      "0";

    document.body.style.overflowX =
      "hidden";

    return () => {
      document.body.style.margin =
        "";

      document.body.style.overflowX =
        "";
    };
  }, []);

  /* -----------------------------------------------
     SAVE DATA
  ------------------------------------------------ */

  useEffect(() => {
    (async () => {
      try {
        const [c, ci] = await Promise.all([fetchCars(), fetchCities()]);
        setCars(c);
        const fetchedCities = Array.isArray(ci) ? ci : [];
        const missingCities = seedCities.filter((seed) => !fetchedCities.some((city) => city.name === seed.name));
        setCities([...fetchedCities, ...missingCities]);

      } catch (err) {
        console.error(err);
      }
    })();
  }, []);
  async function loadAdminData() {
    try {
      const [b, l] = await Promise.all([fetchBookings(), fetchLeads()]);
      if (Array.isArray(b) && b.length) setBookings(b);
      setLeads(Array.isArray(l) ? l : []);
    } catch (err) {
      console.error(err);
    }
  }


  /* -----------------------------------------------
     CONFIRM BOOKING
  ------------------------------------------------ */

  function confirmBooking(
    data
  ) {
    const booking = {
      id: uid("booking"),

      createdAt:
        new Date().toISOString(),

      ...data,
    };

    insertBooking(booking).catch((err) =>
      console.error(err)
    );

    setBookings(
      (prev) => [
        ...prev,
        booking,
      ]
    );

    setCars(
      (prev) =>
        prev.map(
          (car) =>
            car.id ===
            data.carId
              ? {
                  ...car,
                  available:
                    false,
                }
              : car
        )
    );
  }
  /* -----------------------------------------------
     PAYU PAYMENT RETURN
  ------------------------------------------------ */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const payuStatus =
      params.get("payu");

    if (!payuStatus) {
      return;
    }

    const pendingRaw =
      localStorage.getItem(
        "sawariya_pending_booking"
      );

    if (payuStatus === "success") {
      if (!pendingRaw) {
        alert(
          "Payment was successful, but the booking information was not found. Please contact Sawariya Rentals."
        );

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        return;
      }

      try {
        const pendingBooking =
          JSON.parse(
            pendingRaw
          );

        const txnid =
          params.get("txnid");

        const mihpayid =
          params.get("mihpayid");

        confirmBooking({
          ...pendingBooking,

          paymentId:
            mihpayid || null,

          orderId:
            txnid || null,

          status:
            "Confirmed",
        });

        localStorage.removeItem(
          "sawariya_pending_booking"
        );

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        alert(
          pendingBooking.paymentType ===
            "advance"
            ? `Booking confirmed!\n\n₹${Number(
                pendingBooking.paidAmount || 0
              ).toLocaleString(
                "en-IN"
              )} advance paid.\nRemaining ${fmtINR(
                pendingBooking.remainingAmount
              )} payable later.`
            : `Booking confirmed!\n\nFull payment of ${fmtINR(
                pendingBooking.total
              )} received.`
        );
      } catch (error) {
        console.error(
          "PayU booking confirmation error:",
          error
        );

        alert(
          "Payment was successful, but we could not confirm the booking. Please contact Sawariya Rentals."
        );
      }

      return;
    }

    if (payuStatus === "failure") {
      localStorage.removeItem(
        "sawariya_pending_booking"
      );

      const message =
        params.get("message") ||
        "Payment failed or was cancelled.";

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      alert(
        `Payment failed.\n\n${message}`
      );
    }
  }, []);
  
  /* -----------------------------------------------
     ADMIN TOGGLE
  ------------------------------------------------ */

    if (isAdmin) {
    return (
      <AdminGate
        cars={Array.isArray(cars) ? cars : []}
        setCars={setCars}
        cities={Array.isArray(cities) ? cities : []}
        setCities={setCities}
        bookings={Array.isArray(bookings) ? bookings : []}
        leads={Array.isArray(leads) ? leads : []}
        onRefresh={loadAdminData}
        onExit={() => setIsAdmin(false)}
      />
    );
  }
  return (
    <div>
      <CustomerView
        cars={
          cars
        }
        cities={
          cities
        }
        bookings={
          bookings
        }
        leads={
          leads
        }
        onBook={
          confirmBooking
        }
      />

      {/* SECRET / ADMIN BUTTON */}

      <button
        type="button"
        onClick={() =>
          setIsAdmin(
            true
          )
        }
        title="Admin"
        style={{
          position:
            "fixed",
          right: 12,
          bottom: 12,
          width: 42,
          height: 42,
          borderRadius:
            999,
          border:
            `1px solid ${C.border}`,
          background:
            "rgba(255,255,255,.94)",
          color:
            C.gray,
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          cursor:
            "pointer",
          boxShadow:
            "0 8px 25px rgba(15,23,42,.12)",
          zIndex: 100,
        }}
      >
        <Settings
          size={
            18
          }
        />
      </button>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const labelStyle = {
  display:
    "flex",
  alignItems:
    "center",
  gap: 6,
  color:
    C.navy,
  fontSize:
    12,
  fontWeight:
    850,
  marginBottom:
    7,
};

const inputStyle = {
  width:
    "100%",
  minWidth:
    0,
  height:
    46,
  boxSizing:
    "border-box",
  border:
    `1px solid ${C.border}`,
  borderRadius:
    12,
  padding:
    "0 13px",
  background:
    C.white,
  color:
    C.navy,
  fontSize:
    14,
  outline:
    "none",
};
const fieldGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))",
  gap: 10,
};

const whiteCard = { background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: "0 8px 25px rgba(15,23,42,.05)" };
const emptyCard = { background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, padding: 30, textAlign: "center", color: C.gray };
const choiceGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(180px,100%),1fr))", gap: 9 };
const choiceButton = { minHeight: 64, border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, boxSizing: "border-box" };
const modalBackdrop = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.68)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, overflowY: "auto", boxSizing: "border-box" };
const modalCard = { width: "100%", maxWidth: 720, background: C.white, borderRadius: 24, boxShadow: "0 30px 80px rgba(0,0,0,.25)", overflow: "hidden", margin: "0 auto 16px" };
const modalHeader = { padding: "18px 20px", background: "linear-gradient(135deg,#eff6ff,#ffffff)", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 };
const iconButton = { width: 40, height: 40, borderRadius: 999, border: `1px solid ${C.border}`, background: C.white, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.navy };
const infoBox = { background: C.sky, border: `1px solid #dbeafe`, borderRadius: 14, padding: 13, display: "flex", flexDirection: "column", gap: 3, color: C.navy };
const summaryBox = { background: C.grayLight, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, display: "grid", gap: 9 };
const summaryRow = { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 };

const primaryButton = {
  minHeight:
    44,
  border:
    "none",
  borderRadius:
    12,
  padding:
    "10px 15px",
  background:
    C.blue,
  color:
    C.white,
  fontSize:
    14,
  fontWeight:
    900,
  display:
    "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap: 7,
  cursor:
    "pointer",
  boxSizing:
    "border-box",
};

const secondaryButton = {
  minHeight:
    44,
  border:
    `1px solid ${C.border}`,
  borderRadius:
    12,
  padding:
    "10px 15px",
  background:
    C.white,
  color:
    C.navy,
  fontSize:
    14,
  fontWeight:
    850,
  display:
    "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap: 7,
  cursor:
    "pointer",
  boxSizing:
    "border-box",
};

const dangerButton = {
  minHeight:
    38,
  border:
    "1px solid #fecaca",
  borderRadius:
    10,
  padding:
    "8px 11px",
  background:
    C.redLight,
  color:
    C.red,
  fontSize:
    12,
  fontWeight:
    850,
  display:
    "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap: 6,
  cursor:
    "pointer",
  boxSizing:
    "border-box",
};

const smallButton = {
  minHeight:
    38,
  border:
    `1px solid ${C.border}`,
  borderRadius:
    10,
  padding:
    "8px 11px",
  background:
    C.white,
  color:
    C.navy,
  fontSize:
    12,
  fontWeight:
    850,
  display:
    "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap: 6,
  cursor:
    "pointer",
  boxSizing:
    "border-box",
};

/* =========================================================
   EXPORT
========================================================= */

export default App;
