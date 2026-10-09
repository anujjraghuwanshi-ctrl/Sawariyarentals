import ScorpioShowcase from './ScorpioShowcase';

import React, { useEffect, useMemo, useRef, useState } from "react";
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

/* =========================================================
   ADMIN STAT CARD
========================================================= */

const PHONE_1 = { show: "74152 28011", href: "tel:+917415228011" };
const PHONE_2 = { show: "89828 02145", href: "tel:+918982802145" };
const WHATSAPP = "https://wa.me/917415228011";
const MAPS = "https://maps.app.goo.gl/7wp7CfqBHhb1BbDm9?g_st=ic";
const MAP_EMBED = "https://maps.google.com/maps?q=22.7525840,75.8916329&z=16&output=embed";

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
          <a className="sw-call" href={PHONE_1.href}>
            <Phone size={16} /> {PHONE_1.show}
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
            <p>Call {PHONE_1.show} or message us on WhatsApp and we will check what is free.</p>
            <a className="sw-btn sw-btn-saf" href={WHATSAPP} target="_blank" rel="noreferrer">
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
        <a href={WHATSAPP} target="_blank" rel="noreferrer">WhatsApp</a>
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
          <a className="sw-btn sw-btn-wa sw-wide" href={`${WHATSAPP}?text=Hi%20Sawariya%20Rentals`} target="_blank" rel="noreferrer">
            <MessageCircle size={17} /> WhatsApp us, {PHONE_1.show}
          </a>
          <p className="sw-note center">or call {PHONE_2.show}</p>

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
  const items = [
    { i: <Home size={26} />, t: "Delivery and pickup at your door", d: "Choose home delivery while booking and tell us where and when." },
    { i: <Gauge size={26} />, t: "Plans that fit the trip", d: "Hourly, daily, weekly, monthly or a 2-year plan. Extra kilometres are charged by the km." },
    { i: <Wrench size={26} />, t: "Cars that are looked after", d: "Clean, maintained cars with clear rates." },
    { i: <Headphones size={26} />, t: "A real person on the phone", d: `Call ${PHONE_1.show} or message us on WhatsApp.` },
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
            <a href={PHONE_1.href}><Phone size={16} /> {PHONE_1.show}</a>
            <a href={PHONE_2.href}><Phone size={16} /> {PHONE_2.show}</a>
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
  return (
    <>
      <section className="sw-section">
        <div className="sw-wrap sw-visit">
          <div>
            <h2>Visit Sawariya Rentals</h2>
            <p className="sw-visit-text">Indore. Call {PHONE_1.show} or {PHONE_2.show}.</p>
            <a className="sw-btn sw-btn-pea" href={MAPS} target="_blank" rel="noreferrer">
              <MapPin size={17} /> Open in Maps
            </a>
          </div>
          <div className="sw-map">
            <iframe title="Sawariya Rentals location" src={MAP_EMBED} width="100%" height="280" style={{ border: 0 }} loading="lazy" />
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
            <a href={PHONE_1.href}>{PHONE_1.show}</a>
            <a href={PHONE_2.href}>{PHONE_2.show}</a>
            <a href={WHATSAPP} target="_blank" rel="noreferrer">WhatsApp</a>
            <a href={MAPS} target="_blank" rel="noreferrer">Find our location</a>
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
  ⁠}⁠

  const callbackCity =
    cityFilter !== "All" ? cityFilter : cities[0]?.name || "Indore";
  return (
    <div className="bg-[#070709] min-h-screen text-white">
      {/* 1. Full-page Scroll-Driven Scorpio N Experience */}
      <ScorpioShowcase />

      {/* 2. Your Fleet & Booking Engine (Seamlessly attached below) */}
      <div id="fleet" className="pt-16">
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
      </div>

      <Faqs s={settings} />
      <SiteFooter cities={cities} />

      {/* Booking Modals & Overlays */}
      {detailCar && (
        <CarDetail
          car={detailCar}
          settings={settings}
          onBack={() => setDetailCar(null)}
          onBook={setBookingCar}
          onZoom={setZoom}
        />
      )}
      {bookingCar && (
        <BookingModal
          car={bookingCar}
          onClose={() => setBookingCar(null)}
          onConfirm={handleConfirmBooking}
        />
      )}
    </div>
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
   ADMIN STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  color = C.blue,
}) {
  return (
    <div
      style={{
        background:
          C.white,
        border:
          `1px solid ${C.border}`,
        borderRadius:
          18,
        padding: 18,
        display:
          "flex",
        alignItems:
          "center",
        gap: 13,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius:
            14,
          background:
            `${color}12`,
          color,
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          minWidth: 0,
        }}
      >
        <div
          style={{
            color:
              C.gray,
            fontSize:
              12,
            fontWeight:
              700,
          }}
        >
          {label}
        </div>

        <div
          style={{
            color:
              C.navy,
            fontSize:
              22,
            fontWeight:
              950,
            marginTop:
              2,
            wordBreak:
              "break-word",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ADMIN VIEW
========================================================= */

function AdminView({
  cars,
  setCars,
  cities,
  setCities,
  bookings,
  leads = [],
}) {
  const [tab, setTab] =
    useState("dashboard");

    const [leadList, setLeadList] = useState(Array.isArray(leads) ? leads : []);

  useEffect(() => {
    if (tab !== "leads") return;
    (async () => {
      try {
        const rows = await fetchLeads();
        setLeadList(rows || []);
      } catch (err) {
        console.error(err);
        setLeadList([]);
      }
    })();
  }, [tab]);
  
  const [editingCar, setEditingCar] =
    useState(null);

  const [carForm, setCarForm] =
    useState({
      name: "",
      type: "Hatchback",
      seats: 5,
      fuel: "Petrol",
      transmission: "Manual",
      price8: "",
      price12: "",
      price24: "",
      city: "",
      photos: [],
      available: true,
    });

  const [newCity, setNewCity] =
    useState("");

    const safeCars = Array.isArray(cars) ? cars : [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeCities = Array.isArray(cities) ? cities : [];

  const totalCars = safeCars.length;

  const availableCars = safeCars.filter(
    (car) => car.available
  ).length;

  const rentedCars = safeCars.filter(
    (car) => !car.available
  ).length;

  const totalRevenue = safeBookings.reduce(
    (sum, booking) =>
      sum + Number(booking.paidAmount ?? booking.total ?? 0),
    0
  );

  const totalPending = safeBookings.reduce(
    (sum, booking) =>
      sum + Number(booking.remainingAmount ?? 0),
    0
  );

  function resetCarForm() {
    setEditingCar(null);

    setCarForm({
      name: "",
      type: "Hatchback",
      seats: 5,
      fuel: "Petrol",
      transmission: "Manual",
      price8: "",
      price12: "",
      price24: "",
      city:
        cities.find(
          (c) => c.active
        )?.name || "",
      photos: [],
      available: true,
    });
  }

  function editCar(car) {
    setEditingCar(
      car.id
    );

    setCarForm({
      name:
        car.name || "",

      type:
        car.type ||
        "Hatchback",

      seats:
        car.seats || 5,

      fuel:
        car.fuel ||
        "Petrol",

      transmission:
        car.transmission ||
        "Manual",

      price8:
        car.price8 ||
        car.price ||
        "",

      price12:
        car.price12 ||
        car.price ||
        "",

      price24:
        car.price24 ||
        "",

      city:
        car.city || "",

      photos:
        car.photos || [],

      available:
        car.available !==
        false,
    });

    setTab("cars");
  }

  async function saveCar(e) {
    e.preventDefault();

    if (!carForm.name.trim()) {
      alert(
        "Enter car name."
      );
      return;
    }

    if (!carForm.city) {
      alert(
        "Select a city."
      );
      return;
    }

    const vehicleText = `${carForm.name} ${carForm.type}`.toLowerCase();
    if (/bike|scooter|motorcycle|motorbike|moped/.test(vehicleText)) {
      alert("Sawariya Rentals accepts cars only. Two-wheelers cannot be added.");
      return;
    }

    if (
      !carForm.price8 ||
      Number(
        carForm.price8
      ) <= 0
    ) {
      alert(
        "Enter a valid 8-hour price."
      );
      return;
    }

    if (
      !carForm.price12 ||
      Number(
        carForm.price12
      ) <= 0
    ) {
      alert(
        "Enter a valid 12-hour price."
      );
      return;
    }

    if (
      !carForm.price24 ||
      Number(
        carForm.price24
      ) <= 0
    ) {
      alert(
        "Enter a valid 24-hour price."
      );
      return;
    }

    const vehicleData = {
      ...carForm,
      name:
        carForm.name.trim(),
      seats: Number(
        carForm.seats
      ),
      price8:
        Number(
          carForm.price8
        ),
      price12:
        Number(
          carForm.price12
        ),
      price24:
        Number(
          carForm.price24
        ),
      hourlyRate: Number(carForm.price8),
      dailyRate: Number(carForm.price24),
      weeklyRate: Number(DEFAULT_BUSINESS_SETTINGS.weeklyStartingPrice),
      monthlyRate: Number(DEFAULT_BUSINESS_SETTINGS.monthlyStartingPrice),
      longTermRate: Number(DEFAULT_BUSINESS_SETTINGS.longTermMonthlyPrice),
      hourlyKm: Number(DEFAULT_BUSINESS_SETTINGS.hourlyIncludedKm),
      dailyKm: Number(DEFAULT_BUSINESS_SETTINGS.dailyIncludedKm),
      extraKmRate: Number(DEFAULT_BUSINESS_SETTINGS.extraKmRate),
      driverCost: Number(DEFAULT_BUSINESS_SETTINGS.driverCostPerDay),
    };

    let saved = {
      id: editingCar || undefined,
      ...vehicleData,
    };

    try {
      const photos = [];
      for (const p of saved.photos || []) {
        if (typeof p === "string" && p.startsWith("data:")) {
          photos.push(await uploadPhoto(p));
        } else {
          photos.push(p);
        }
      }
      saved.photos = photos;
      const cloudId = await upsertCar(saved);
      if (cloudId) saved.id = cloudId;
      if (!saved.id) saved.id = uid("car");
    } catch (err) {
      alert("Cloud save failed: " + (err.message || err));
      return;
    }

    if (editingCar) {
      setCars(
        (prev) =>
          prev.map(
            (car) =>
              car.id ===
              editingCar
                ? {
                    ...car,
                    ...saved,
                  }
                : car
          )
      );
    } else {
      setCars(
        (prev) => [
          ...prev,
          saved,
        ]
      );
    }

    const wasEditing =
      Boolean(
        editingCar
      );

    resetCarForm();

    alert(
      wasEditing
        ? "Car updated successfully."
        : "Car added successfully."
    );
  }

    async function deleteCar(id) {
    const car =
      cars.find(
        (item) =>
          item.id === id
      );

    if (!car) return;

    if (
      !window.confirm(
        `Delete ${car.name}?`
      )
    ) {
      return;
    }

    try {
      await deleteCarCloud(id);
    } catch (err) {
      console.error(err);
    }

    setCars(
      (prev) =>
        prev.filter(
          (item) =>
            item.id !== id
        )
    );
  }

  function toggleAvailability(
    id
  ) {
    setCars(
      (prev) =>
        prev.map(
          (car) =>
            car.id === id
              ? {
                  ...car,
                  available:
                    !car.available,
                }
              : car
        )
    );
  }

  async function handlePhotoUpload(
    e,
    carId = null
  ) {
    const files =
      Array.from(
        e.target.files ||
          []
      );

    if (!files.length)
      return;

    try {
      const compressed =
        [];

      for (
        const file of files
      ) {
        if (
          !file.type.startsWith(
            "image/"
          )
        ) {
          continue;
        }

        const image =
          await compressImage(
            file
          );

        compressed.push(
          image
        );
      }

      if (carId) {
        setCars(
          (prev) =>
            prev.map(
              (car) =>
                car.id ===
                carId
                  ? {
                      ...car,
                      photos: [
                        ...(car.photos ||
                          []),
                        ...compressed,
                      ],
                    }
                  : car
            )
        );
      } else {
        setCarForm(
          (prev) => ({
            ...prev,
            photos: [
              ...(prev.photos ||
                []),
              ...compressed,
            ],
          })
        );
      }
    } catch (error) {
      console.error(
        error
      );

      alert(
        "Unable to process the selected image."
      );
    }

    e.target.value =
      "";
  }

  function removeFormPhoto(
    index
  ) {
    setCarForm(
      (prev) => ({
        ...prev,
        photos:
          prev.photos.filter(
            (_, i) =>
              i !== index
          ),
      })
    );
  }

  function removeCarPhoto(
    carId,
    index
  ) {
    setCars(
      (prev) =>
        prev.map(
          (car) =>
            car.id === carId
              ? {
                  ...car,
                  photos:
                    (
                      car.photos ||
                      []
                    ).filter(
                      (_, i) =>
                        i !==
                        index
                    ),
                }
              : car
        )
    );
  }

  async function addCity(e) {
    e.preventDefault();

    const name =
      newCity.trim();

    if (!name) return;

    const exists =
      cities.some(
        (city) =>
          city.name
            .toLowerCase() ===
          name.toLowerCase()
      );

    if (exists) {
      alert(
        "City already exists."
      );
      return;
    }

    const city = {
      name,
      active: true,
    };

    try {
      await upsertCity(city);
    } catch (err) {
      alert(
        "City save failed: " +
          (err.message || err)
      );
      return;
    }

    setCities(
      (prev) => [
        ...prev,
        {
          id: uid("city"),
          ...city,
        },
      ]
    );

    setNewCity("");
  }

  function toggleCity(id) {
    setCities(
      (prev) =>
        prev.map(
          (city) =>
            city.id === id
              ? {
                  ...city,
                  active:
                    !city.active,
                }
              : city
        )
    );
  }

  function deleteCity(id) {
    const city =
      cities.find(
        (item) =>
          item.id === id
      );

    if (!city) return;

    const used =
      cars.some(
        (car) =>
          car.city ===
          city.name
      );

    if (used) {
      alert(
        "This city is currently assigned to one or more cars. Change those cars first."
      );
      return;
    }

    if (
      !window.confirm(
        `Delete ${city.name}?`
      )
    ) {
      return;
    }

    setCities(
      (prev) =>
        prev.filter(
          (item) =>
            item.id !== id
        )
    );
  }

  return (
    <div
      style={{
        minHeight:
          "100vh",
        background:
          "#f8fafc",
        color:
          C.navy,
      }}
    >
      {/* ADMIN HEADER */}

      <header
        style={{
          background:
            C.navy,
          color:
            C.white,
        }}
      >
        <div
          style={{
            maxWidth:
              1200,
            margin:
              "0 auto",
            padding: 16,
            display:
              "flex",
            flexWrap:
              "wrap",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 10,
            }}
          >
            <Settings
              size={22}
            />

            <div>
              <div
                style={{
                  fontWeight:
                    950,
                  fontSize:
                    18,
                }}
              >
                SAWARIYA ADMIN
              </div>

              <div
                style={{
                  opacity:
                    0.7,
                  fontSize:
                    11,
                }}
              >
                Fleet & Booking Management
              </div>
            </div>
          </div>

          <Badge color="#38bdf8">
            <ShieldCheck
              size={13}
            />
            Admin Mode
          </Badge>
        </div>
      </header>

      {/* ADMIN NAV */}

      <div
        style={{
          background:
            C.white,
          borderBottom:
            `1px solid ${C.border}`,
          position:
            "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth:
              1200,
            margin:
              "0 auto",
            padding:
              "10px 16px",
            display:
              "flex",
            gap: 8,
            overflowX:
              "auto",
          }}
        >
          {[
            [
              "dashboard",
              "Dashboard",
            ],
            [
              "cars",
              "Vehicles",
            ],
            [
              "bookings",
              "Bookings",
            ],
            [
              "leads",
              "Leads",
            ],
            [
              "cities",
              "Cities",
            ],
            [
              "business",
              "Business",
            ],
          ].map(
            ([
              value,
              label,
            ]) => (
              <button
                type="button"
                key={
                  value
                }
                onClick={() =>
                  setTab(
                    value
                  )
                }
                style={{
                  border:
                    "none",
                  borderRadius:
                    12,
                  padding:
                    "10px 14px",
                  background:
                    tab ===
                    value
                      ? C.blue
                      : C.grayLight,
                  color:
                    tab ===
                    value
                      ? C.white
                      : C.navy,
                  fontWeight:
                    850,
                  cursor:
                    "pointer",
                  whiteSpace:
                    "nowrap",
                }}
              >
                {
                  label
                }
              </button>
            )
          )}
        </div>
      </div>

      <main
        style={{
          maxWidth:
            1200,
          margin:
            "0 auto",
          padding:
            "22px 16px 60px",
        }}
      >
        {/* DASHBOARD */}

        {tab ===
          "dashboard" && (
          <>
            <div
              style={{
                marginBottom:
                  18,
              }}
            >
              <h1
                style={{
                  margin:
                    0,
                  fontSize:
                    28,
                  fontWeight:
                    950,
                }}
              >
                Dashboard
              </h1>

              <p
                style={{
                  color:
                    C.gray,
                  margin:
                    "5px 0 0",
                }}
              >
                Overview of your rental
                business.
              </p>
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
                gap: 12,
              }}
            >
              <StatCard
                icon={
                  <Car size={21} />
                }
                label="Total Vehicles"
                value={
                  totalCars
                }
                color={
                  C.blue
                }
              />

              <StatCard
                icon={
                  <CheckCircle2
                    size={21}
                  />
                }
                label="Available"
                value={
                  availableCars
                }
                color={
                  C.green
                }
              />

              <StatCard
                icon={
                  <Clock3
                    size={21}
                  />
                }
                label="Rented"
                value={
                  rentedCars
                }
                color={
                  C.orange
                }
              />

              <StatCard
                icon={
                  <IndianRupee
                    size={21}
                  />
                }
                label="Money Collected"
                value={fmtINR(
                  totalRevenue
                )}
                color={
                  C.green
                }
              />

              <StatCard
                icon={
                  <CreditCard
                    size={21}
                  />
                }
                label="Pending Later"
                value={fmtINR(
                  totalPending
                )}
                color={
                  C.orange
                }
              />

              <StatCard
                icon={
                  <CalendarDays
                    size={21}
                  />
                }
                label="Total Bookings"
                value={
                  bookings.length
                }
                color={
                  C.blue
                }
              />
            </div>
          </>
        )}

        {/* VEHICLES */}

        {tab === "cars" && (
          <>
            <div
              style={{
                display:
                  "flex",
                flexWrap:
                  "wrap",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: 12,
                marginBottom:
                  18,
              }}
            >
              <div>
                <h1
                  style={{
                    margin:
                      0,
                    fontSize:
                      28,
                    fontWeight:
                      950,
                  }}
                >
                  Vehicles
                </h1>

                <p
                  style={{
                    color:
                      C.gray,
                    margin:
                      "5px 0 0",
                  }}
                >
                  Add cars, 8/12 hour
                  prices and photos.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  resetCarForm
                }
                style={
                  primaryButton
                }
              >
                <Plus
                  size={17}
                />
                Add Vehicle
              </button>
            </div>

            {/* CAR FORM */}

            <div
              style={{
                background:
                  C.white,
                border:
                  `1px solid ${C.border}`,
                borderRadius:
                  20,
                padding: 18,
                marginBottom:
                  20,
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: 10,
                  marginBottom:
                    14,
                }}
              >
                <h2
                  style={{
                    margin:
                      0,
                    fontSize:
                      18,
                    fontWeight:
                      950,
                  }}
                >
                  {editingCar
                    ? "Edit Vehicle"
                    : "Add Vehicle"}
                </h2>

                {editingCar && (
                  <button
                    type="button"
                    onClick={
                      resetCarForm
                    }
                    style={
                      smallButton
                    }
                  >
                    <X
                      size={14}
                    />
                    Cancel
                  </button>
                )}
              </div>

              <form
                onSubmit={
                  saveCar
                }
              >
                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(180px, 100%), 1fr))",
                    gap: 13,
                  }}
                >
                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Car Name
                    </label>

                    <input
                      value={
                        carForm.name
                      }
                      onChange={(
                        e
                      ) =>
                        setCarForm(
                          (
                            prev
                          ) => ({
                            ...prev,
                            name:
                              e
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Maruti Swift"
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Type
                    </label>

                    <select
                      value={
                        carForm.type
                      }
                      onChange={(
                        e
                      ) =>
                        setCarForm(
                          (
                            prev
                          ) => ({
                            ...prev,
                            type:
                              e
                                .target
                                .value,
                          })
                        )
                      }
                      style={
                        inputStyle
                      }
                    >
                      <option>
                        Hatchback
                      </option>
                      <option>
                        Sedan
                      </option>
                      <option>
                        SUV
                      </option>
                      <option>
                        MUV
                      </option>
                      <option>
                        Luxury
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Seats
                    </label>

                    <input
                      type="number"
                      min="2"
                      max="12"
                      value={
                        carForm.seats
                      }
                      onChange={(
                        e
                      ) =>
                        setCarForm(
                          (
                            prev
                          ) => ({
                            ...prev,
                            seats:
                              e
                                .target
                                .value,
                          })
                        )
                      }
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Fuel
                    </label>

                    <select
                      value={
                        carForm.fuel
                      }
                      onChange={(
                        e
                      ) =>
                        setCarForm(
                          (
                            prev
                          ) => ({
                            ...prev,
                            fuel:
                              e
                                .target
                                .value,
                          })
                        )
                      }
                      style={
                        inputStyle
                      }
                    >
                      <option>
                        Petrol
                      </option>
                      <option>
                        Diesel
                      </option>
                      <option>
                        CNG
                      </option>
                      <option>
                        Electric
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Transmission
                    </label>

                    <select
                      value={
                        carForm.transmission
                      }
                      onChange={(
                        e
                      ) =>
                        setCarForm(
                          (
                            prev
                          ) => ({
                            ...prev,
                            transmission:
                              e
                                .target
                                .value,
                          })
                        )
                      }
                      style={
                        inputStyle
                      }
                    >
                      <option>
                        Manual
                      </option>
                      <option>
                        Automatic
                      </option>
                    </select>
                  </div>

                  {/* 8 HOUR PRICE */}

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      8 Hour Price
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        carForm.price8
                      }
                      onChange={(
                        e
                      ) =>
                        setCarForm(
                          (
                            prev
                          ) => ({
                            ...prev,
                            price8:
                              e
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="999"
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  {/* 12 HOUR PRICE */}

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      12 Hour Price
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        carForm.price12
                      }
                      onChange={(
                        e
                      ) =>
                        setCarForm(
                          (
                            prev
                          ) => ({
                            ...prev,
                            price12:
                              e
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="1499"
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      24 Hour Price
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        carForm.price24
                      }
                      onChange={(
                        e
                      ) =>
                        setCarForm(
                          (
                            prev
                          ) => ({
                            ...prev,
                            price24:
                              e
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="2499"
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      City
                    </label>

                    <select
                      value={
                        carForm.city
                      }
                      onChange={(
                        e
                      ) =>
                        setCarForm(
                          (
                            prev
                          ) => ({
                            ...prev,
                            city:
                              e
                                .target
                                .value,
                          })
                        )
                      }
                      style={
                        inputStyle
                      }
                    >
                      <option value="">
                        Select City
                      </option>

                      {cities
                        .filter(
                          (
                            city
                          ) =>
                            city.active
                        )
                        .map(
                          (
                            city
                          ) => (
                            <option
                              key={
                                city.id
                              }
                              value={
                                city.name
                              }
                            >
                              {
                                city.name
                              }
                            </option>
                          )
                        )}
                    </select>
                  </div>
                </div>

                {/* PHOTO UPLOAD */}

                <div
                  style={{
                    marginTop:
                      18,
                    padding:
                      15,
                    borderRadius:
                      17,
                    background:
                      C.grayLight,
                    border:
                      `1px solid ${C.border}`,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      flexWrap:
                        "wrap",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight:
                            900,
                          color:
                            C.navy,
                        }}
                      >
                        Vehicle Photos
                      </div>

                      <div
                        style={{
                          fontSize:
                            12,
                          color:
                            C.gray,
                          marginTop:
                            3,
                        }}
                      >
                        Add one or more
                        photos. JPG/PNG
                        supported.
                      </div>
                    </div>

                    <label
                      style={{
                        ...smallButton,
                        cursor:
                          "pointer",
                      }}
                    >
                      <ImagePlus
                        size={
                          15
                        }
                      />
                      Add Photos

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(
                          e
                        ) =>
                          handlePhotoUpload(
                            e
                          )
                        }
                        style={{
                          display:
                            "none",
                        }}
                      />
                    </label>
                  </div>

                  {carForm
                    .photos
                    .length >
                    0 && (
                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(110px, 1fr))",
                        gap: 10,
                        marginTop:
                          14,
                      }}
                    >
                      {carForm.photos.map(
                        (
                          photo,
                          index
                        ) => (
                          <div
                            key={`${photo}-${index}`}
                            style={{
                              position:
                                "relative",
                              aspectRatio:
                                "4 / 3",
                              borderRadius:
                                12,
                              overflow:
                                "hidden",
                              background:
                                "#e2e8f0",
                            }}
                          >
                            <img
                              src={
                                photo
                              }
                              alt={`Vehicle ${
                                index +
                                1
                              }`}
                              style={{
                                width:
                                  "100%",
                                height:
                                  "100%",
                                objectFit:
                                  "cover",
                              }}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                removeFormPhoto(
                                  index
                                )
                              }
                              style={{
                                position:
                                  "absolute",
                                right: 5,
                                top: 5,
                                width: 28,
                                height: 28,
                                borderRadius:
                                  999,
                                border:
                                  "none",
                                background:
                                  "rgba(220,38,38,.9)",
                                color:
                                  "white",
                                cursor:
                                  "pointer",
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                              }}
                            >
                              <X
                                size={
                                  15
                                }
                              />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    flexWrap:
                      "wrap",
                    gap: 10,
                    marginTop:
                      16,
                  }}
                >
                  <button
                    type="submit"
                    style={
                      primaryButton
                    }
                  >
                    <CheckCircle2
                      size={
                        17
                      }
                    />

                    {editingCar
                      ? "Update Vehicle"
                      : "Save Vehicle"}
                  </button>
                </div>
              </form>
            </div>

            {/* VEHICLE LIST */}

            <div
              style={{
                display:
                  "grid",
                gap: 12,
              }}
            >
              {cars.length ===
                0 && (
                <div
                  style={{
                    padding:
                      35,
                    textAlign:
                      "center",
                    background:
                      C.white,
                    border:
                      `1px solid ${C.border}`,
                    borderRadius:
                      18,
                    color:
                      C.gray,
                  }}
                >
                  <Car
                    size={
                      45
                    }
                    color={
                      C.blue
                    }
                  />

                  <div
                    style={{
                      marginTop:
                        10,
                      fontWeight:
                        900,
                      color:
                        C.navy,
                    }}
                  >
                    No vehicles added
                  </div>

                  <div
                    style={{
                      fontSize:
                        12,
                      marginTop:
                        4,
                    }}
                  >
                    Use "Add Vehicle" to
                    add your first car.
                  </div>
                </div>
              )}

              {cars.map(
                (car) => (
                  <div
                    key={
                      car.id
                    }
                    style={{
                      background:
                        C.white,
                      border:
                        `1px solid ${C.border}`,
                      borderRadius:
                        18,
                      padding:
                        12,
                      display:
                        "grid",
                      gridTemplateColumns:
                        "90px minmax(0,1fr)",
                      gap: 13,
                    }}
                  >
                    <CarThumb
                      car={
                        car
                      }
                      size={
                        90
                      }
                    />

                    <div
                      style={{
                        minWidth:
                          0,
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          flexWrap:
                            "wrap",
                          alignItems:
                            "center",
                          justifyContent:
                            "space-between",
                          gap: 8,
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              fontSize:
                                16,
                              wordBreak:
                                "break-word",
                            }}
                          >
                            {
                              car.name
                            }
                          </strong>

                          <div
                            style={{
                              color:
                                C.gray,
                              fontSize:
                                12,
                              marginTop:
                                3,
                            }}
                          >
                            {
                              car.type
                            }{" "}
                            •{" "}
                            {
                              car.city
                            }
                          </div>

                          <div
                            style={{
                              display:
                                "flex",
                              gap: 6,
                              flexWrap:
                                "wrap",
                              marginTop:
                                7,
                            }}
                          >
                            <Badge
                              color={
                                C.blue
                              }
                            >
                              8H{" "}
                              {fmtINR(
                                car.price8 ||
                                  car.price
                              )}
                            </Badge>

                            <Badge
                              color={
                                C.green
                              }
                            >
                              12H{" "}
                              {fmtINR(
                                car.price12 ||
                                  car.price
                              )}
                            </Badge>
                          </div>
                        </div>

                        <Badge
                          color={
                            car.available
                              ? C.green
                              : C.red
                          }
                        >
                          {car.available
                            ? "Available"
                            : "Rented"}
                        </Badge>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          flexWrap:
                            "wrap",
                          gap: 7,
                          marginTop:
                            10,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            toggleAvailability(
                              car.id
                            )
                          }
                          style={
                            smallButton
                          }
                        >
                          <Clock3
                            size={
                              14
                            }
                          />

                          {car.available
                            ? "Mark Rented"
                            : "Mark Available"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            editCar(
                              car
                            )
                          }
                          style={
                            smallButton
                          }
                        >
                          <Pencil
                            size={
                              14
                            }
                          />
                          Edit
                        </button>

                        <label
                          style={{
                            ...smallButton,
                            cursor:
                              "pointer",
                          }}
                        >
                          <Camera
                            size={
                              14
                            }
                          />
                          Add Photo

                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(
                              e
                            ) =>
                              handlePhotoUpload(
                                e,
                                car.id
                              )
                            }
                            style={{
                              display:
                                "none",
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            deleteCar(
                              car.id
                            )
                          }
                          style={
                            dangerButton
                          }
                        >
                          <Trash2
                            size={
                              14
                            }
                          />
                          Delete
                        </button>
                      </div>

                      {car.photos
                        ?.length >
                        0 && (
                        <div
                          style={{
                            display:
                              "flex",
                            flexWrap:
                              "wrap",
                            gap: 8,
                            marginTop:
                              12,
                          }}
                        >
                          {car.photos.map(
                            (
                              photo,
                              index
                            ) => (
                              <div
                                key={`${car.id}-${index}`}
                                style={{
                                  position:
                                    "relative",
                                  width: 75,
                                  height: 55,
                                  borderRadius:
                                    9,
                                  overflow:
                                    "hidden",
                                }}
                              >
                                <img
                                  src={
                                    photo
                                  }
                                  alt={`${car.name} ${
                                    index +
                                    1
                                  }`}
                                  style={{
                                    width:
                                      "100%",
                                    height:
                                      "100%",
                                    objectFit:
                                      "cover",
                                  }}
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeCarPhoto(
                                      car.id,
                                      index
                                    )
                                  }
                                  style={{
                                    position:
                                      "absolute",
                                    right: 3,
                                    top: 3,
                                    width: 21,
                                    height: 21,
                                    borderRadius:
                                      999,
                                    border:
                                      "none",
                                    background:
                                      "rgba(220,38,38,.9)",
                                    color:
                                      "white",
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    justifyContent:
                                      "center",
                                    cursor:
                                      "pointer",
                                  }}
                                >
                                  <X
                                    size={
                                      12
                                    }
                                  />
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}

        {/* BOOKINGS */}

        {tab ===
          "bookings" && (
          <>
            <div
              style={{
                marginBottom:
                  18,
              }}
            >
              <h1
                style={{
                  margin:
                    0,
                  fontSize:
                    28,
                  fontWeight:
                    950,
                }}
              >
                Bookings
              </h1>

              <p
                style={{
                  color:
                    C.gray,
                  margin:
                    "5px 0 0",
                }}
              >
                Payment and customer
                records.
              </p>
            </div>

            {bookings.length ===
            0 ? (
              <div
                style={{
                  background:
                    C.white,
                  border:
                    `1px solid ${C.border}`,
                  borderRadius:
                    18,
                  padding:
                    40,
                  textAlign:
                    "center",
                  color:
                    C.gray,
                }}
              >
                No bookings yet.
              </div>
            ) : (
              <div
                style={{
                  display:
                    "grid",
                  gap: 12,
                }}
              >
                {bookings
                  .slice()
                  .reverse()
                  .map(
                    (
                      booking
                    ) => (
                      <div
                        key={
                          booking.id
                        }
                        style={{
                          background:
                            C.white,
                          border:
                            `1px solid ${C.border}`,
                          borderRadius:
                            18,
                          padding:
                            16,
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            flexWrap:
                              "wrap",
                            justifyContent:
                              "space-between",
                            gap: 12,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                display:
                                  "flex",
                                flexWrap:
                                  "wrap",
                                alignItems:
                                  "center",
                                gap: 8,
                              }}
                            >
                              <strong
                                style={{
                                  fontSize:
                                    18,
                                }}
                              >
                                {
                                  booking.carName
                                }
                              </strong>

                              <Badge
                                color={
                                  C.green
                                }
                              >
                                {
                                  booking.status
                                }
                              </Badge>
                            </div>

                            <div
                              style={{
                                marginTop:
                                  7,
                                color:
                                  C.gray,
                                fontSize:
                                  13,
                              }}
                            >
                              {
                                booking.name
                              }{" "}
                              •{" "}
                              {
                                booking.phone
                              }
                            </div>

                            <div
                              style={{
                                marginTop:
                                  5,
                                color:
                                  C.gray,
                                fontSize:
                                  13,
                              }}
                            >
                              Pickup:{" "}
                              {
                                booking.pickupDate
                              }{" "}
                              at{" "}
                              {
                                booking.pickupTime
                              }
                            </div>

                            <div
                              style={{
                                marginTop:
                                  5,
                                color:
                                  C.blue,
                                fontWeight:
                                  800,
                                fontSize:
                                  13,
                              }}
                            >
                              Duration:{" "}
                              {
                                booking.rentalDuration
                              }{" "}
                              Hours
                            </div>
                          </div>

                          <div
                            style={{
                              textAlign:
                                "right",
                            }}
                          >
                            <div
                              style={{
                                color:
                                  C.green,
                                fontWeight:
                                  950,
                                fontSize:
                                  18,
                              }}
                            >
                              Paid{" "}
                              {fmtINR(
                                booking.paidAmount
                              )}
                            </div>

                            <div
                              style={{
                                color:
                                  C.navy,
                                fontWeight:
                                  800,
                                fontSize:
                                  13,
                                marginTop:
                                  4,
                              }}
                            >
                              Total{" "}
                              {fmtINR(
                                booking.total
                              )}
                            </div>

                            <div
                              style={{
                                color:
                                  C.orange,
                                fontSize:
                                  13,
                                marginTop:
                                  4,
                              }}
                            >
                              Remaining{" "}
                              {fmtINR(
                                booking.remainingAmount
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop:
                              13,
                            paddingTop:
                              12,
                            borderTop:
                              `1px solid ${C.border}`,
                            display:
                              "flex",
                            flexWrap:
                              "wrap",
                            gap: 8,
                          }}
                        >
                          <Badge
                            color={
                              booking.paymentType ===
                              "advance"
                                ? C.orange
                                : C.green
                            }
                          >
                            <CreditCard
                              size={
                                12
                              }
                            />

                            {booking.paymentType ===
                            "advance"
                              ? "₹500 Advance"
                              : "Full Payment"}
                          </Badge>

                          {booking.orderId && (
                            <Badge
                              color={
                                C.gray
                              }
                            >
                              Order:{" "}
                              {
                                booking.orderId
                              }
                            </Badge>
                          )}

                          {booking.paymentId && (
                            <Badge
                              color={
                                C.gray
                              }
                            >
                              Payment:{" "}
                              {
                                booking.paymentId
                              }
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  )}
              </div>
            )}
          </>
        )}

        {/* CITIES */}

        {tab === "leads" && (
          <>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950 }}>
                Leads
              </h1>
              <p style={{ color: C.gray, margin: "5px 0 0" }}>
                Numbers saved from the booking form.
              </p>
            </div>

             {(leadList || []).length === 0 ? (
              <div
                style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: 18,
                  padding: 40,
                  textAlign: "center",
                  color: C.gray,
                }}
              >
                No leads yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
              {(leadList || []).map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: 18,
                      padding: 16,
                    }}
                  >
                    <strong style={{ fontSize: 18 }}>{lead.phone}</strong>
                    <div style={{ color: C.gray, fontSize: 13, marginTop: 6 }}>
                      {lead.name || "—"} · {lead.city || "—"} · {lead.car_name || "—"}
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                      <a href={`tel:+91${String(lead.phone || "").replace(/\D/g, "")}`} style={{ color: C.blue, fontWeight: 800 }}>
                        Call
                      </a>
                      <a
                        href={`https://wa.me/91${String(lead.phone || "").replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: C.green, fontWeight: 800 }}
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "cities" && (
          <>
            <div
              style={{
                marginBottom:
                  18,
              }}
            >
              <h1
                style={{
                  margin:
                    0,
                  fontSize:
                    28,
                  fontWeight:
                    950,
                }}
              >
                Cities
              </h1>

              <p
                style={{
                  color:
                    C.gray,
                  margin:
                    "5px 0 0",
                }}
              >
                Manage rental locations.
              </p>
            </div>

            <form
              onSubmit={
                addCity
              }
              style={{
                background:
                  C.white,
                border:
                  `1px solid ${C.border}`,
                borderRadius:
                  18,
                padding:
                  16,
                display:
                  "flex",
                flexWrap:
                  "wrap",
                gap: 10,
              }}
            >
              <input
                value={
                  newCity
                }
                onChange={(
                  e
                ) =>
                  setNewCity(
                    e.target
                      .value
                  )
                }
                placeholder="Enter city name"
                style={{
                  ...inputStyle,
                  flex:
                    "1 1 220px",
                }}
              />

              <button
                type="submit"
                style={
                  primaryButton
                }
              >
                <Plus
                  size={
                    16
                  }
                />
                Add City
              </button>
            </form>

            <div
              style={{
                display:
                  "grid",
                gap: 10,
                marginTop:
                  16,
              }}
            >
              {cities.map(
                (city) => (
                  <div
                    key={
                      city.id
                    }
                    style={{
                      background:
                        C.white,
                      border:
                        `1px solid ${C.border}`,
                      borderRadius:
                        16,
                      padding:
                        14,
                      display:
                        "flex",
                      flexWrap:
                        "wrap",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 10,
                      }}
                    >
                      <MapPin
                        size={
                          19
                        }
                        color={
                          C.blue
                        }
                      />

                      <strong>
                        {
                          city.name
                        }
                      </strong>

                      <Badge
                        color={
                          city.active
                            ? C.green
                            : C.gray
                        }
                      >
                        {city.active
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        flexWrap:
                          "wrap",
                        gap: 7,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleCity(
                            city.id
                          )
                        }
                        style={
                          smallButton
                        }
                      >
                        {city.active
                          ? "Disable"
                          : "Enable"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteCity(
                            city.id
                          )
                        }
                        style={
                          dangerButton
                        }
                      >
                        <Trash2
                          size={
                            14
                          }
                        />
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
        {tab === "business" && (
          <BusinessControls
            cars={cars}
            setCars={setCars}
          />
        )}
      </main>
    </div>
  );
}

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Admin panel error" };
  }
  componentDidCatch(error, info) {
    console.error("Sawariya Admin Panel Error", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: C.grayLight, padding: 20, boxSizing: "border-box" }}>
          <div style={{ maxWidth: 720, margin: "60px auto", background: C.white, border: `1px solid ${C.border}`, borderRadius: 22, padding: 24, boxShadow: "0 18px 50px rgba(15,23,42,.08)" }}>
            <Badge color={C.red}>Admin error caught safely</Badge>
            <h2 style={{ margin: "12px 0 8px" }}>The admin panel hit an error</h2>
            <p style={{ color: C.gray, lineHeight: 1.6 }}>Your customer website is still protected. Refresh the page and try Admin again. If it happens again, the error below helps us locate the exact component.</p>
            <pre style={{ whiteSpace: "pre-wrap", background: C.grayLight, padding: 12, borderRadius: 12, fontSize: 12, overflowX: "auto" }}>{this.state.message}</pre>
            <button type="button" onClick={() => window.location.reload()} style={primaryButton}>Reload Admin</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function VehiclePricingEditor({ car, onSaved }) {
  const [form, setForm] = useState({
    hourlyRate: car.hourlyRate ?? "",
    dailyRate: car.dailyRate ?? car.price24 ?? "",
    weeklyRate: car.weeklyRate ?? "",
    monthlyRate: car.monthlyRate ?? "",
    longTermRate: car.longTermRate ?? "",
    hourlyKm: car.hourlyKm ?? 20,
    dailyKm: car.dailyKm ?? 280,
    extraKmRate: car.extraKmRate ?? 6,
    driverCost: car.driverCost ?? 1000,
    fuelCostPerKm: car.fuelCostPerKm ?? "",
    securityDeposit: car.securityDeposit ?? "",
  });
  async function save() {
    const updated = { ...car, ...form };
    ["hourlyRate", "dailyRate", "weeklyRate", "monthlyRate", "longTermRate", "hourlyKm", "dailyKm", "extraKmRate", "driverCost", "fuelCostPerKm", "securityDeposit"].forEach((key) => {
      if (form[key] !== "") updated[key] = Number(form[key]);
    });
    try {
      await upsertCar(updated);
      onSaved(updated);
      alert(`${car.name} pricing saved.`);
    } catch (error) {
      console.error(error);
      alert(error?.message || "Could not save vehicle pricing.");
    }
  }
  const field = (key, label) => <Field label={label}><input type="number" value={form[key]} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))} style={inputStyle} /></Field>;
  return (
    <div style={{ padding: 14, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 12 }}>
      <strong>{car.name}</strong><div style={{ color: C.gray, fontSize: 12, margin: "3px 0 12px" }}>{car.city} · {car.fuel}</div>
      <div style={fieldGrid}>{field("hourlyRate", "Hourly ₹/hr")}{field("dailyRate", "Daily ₹")}{field("weeklyRate", "Weekly ₹")}{field("monthlyRate", "Monthly ₹")}{field("longTermRate", "24-month ₹/month")}{field("hourlyKm", "Hourly included KM")}{field("dailyKm", "Daily included KM")}{field("extraKmRate", "Extra ₹/km")}{field("driverCost", "Driver cost/day")}{field("fuelCostPerKm", "Fuel cost/km")}{field("securityDeposit", "Security deposit (admin only)")}</div>
      <button type="button" onClick={save} style={{ ...primaryButton, marginTop: 12 }}>Save {car.name}</button>
    </div>
  );

}

function BusinessControls({ cars, setCars }) {
  const [settings, setSettings] = useState(() => loadShared("sawariya_business_settings", DEFAULT_BUSINESS_SETTINGS));
  const [packages, setPackages] = useState(() => loadShared("sawariya_travel_packages", DEFAULT_TRAVEL_PACKAGES));
  const [decorations, setDecorations] = useState(() => loadShared("sawariya_decorations", DEFAULT_DECORATIONS));
  const [section, setSection] = useState("pricing");
  const saveSettings = () => { saveShared("sawariya_business_settings", settings); alert("Pricing settings saved."); };
  const saveContent = () => { saveShared("sawariya_travel_packages", packages); saveShared("sawariya_decorations", decorations); alert("Travel packages and decorations saved."); };
  const update = (setter, index, key, value) => setter((list) => list.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const numberField = (key, label) => <Field label={label}><input type="number" value={settings[key]} onChange={(e) => setSettings((old) => ({ ...old, [key]: Number(e.target.value) }))} style={inputStyle} /></Field>;
  return (
    <section style={{ background: C.grayLight, minHeight: "calc(100vh - 120px)", padding: "20px 16px 60px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ ...whiteCard, padding: 18 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Business Controls</h1>
          <p style={{ margin: "6px 0 18px", color: C.gray }}>Change public pricing, vehicle pricing, travel packages and decorated-car options. Security deposit values stay admin-only.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {[['pricing','Pricing'],['vehicles','Vehicle pricing'],['travel','Travel packages'],['decor','Decorations']].map(([id,label]) => <button type="button" key={id} onClick={() => setSection(id)} style={section === id ? primaryButton : secondaryButton}>{label}</button>)}
          </div>
          {section === "pricing" && <>
            <div style={fieldGrid}>{numberField("hourlyStartingPrice", "Hourly starting ₹/hr")}{numberField("hourlyIncludedKm", "Hourly included KM")}{numberField("dailyStartingPrice", "Daily starting ₹")}{numberField("dailyIncludedKm", "Daily included KM")}{numberField("weeklyStartingPrice", "Weekly starting ₹")}{numberField("monthlyStartingPrice", "1-month price ₹")}{numberField("longTermMonthlyPrice", "24-month ₹/month")}{numberField("longTermMonths", "Long-term months")}{numberField("extraKmRate", "Extra ₹/km")}{numberField("driverCostPerDay", "Driver cost/day")}{numberField("cngCostPerKm", "CNG cost/km")}{numberField("dieselCostPerKm", "Diesel cost/km")}{numberField("petrolCostPerKm", "Petrol cost/km")}{numberField("guideCostPerDay", "Guide cost/day")}{numberField("returnTimeCostPerHour", "Recovery time cost/hour")}{numberField("deliveryFlatCharge", "Home delivery charge")}{numberField("marginPercent", "Business margin %")}{numberField("bookingAdvance", "Booking advance")}</div>
            <button type="button" onClick={saveSettings} style={{ ...primaryButton, marginTop: 16 }}>Save pricing</button>
          </>}
          {section === "vehicles" && <><h2 style={{ marginTop: 0 }}>Vehicle-specific pricing</h2><p style={{ color: C.gray }}>Leave a field blank to use the business default. Security deposit is stored only for admin use.</p>{cars.length ? cars.map((car) => <VehiclePricingEditor key={car.id} car={car} onSaved={(updated) => setCars((list) => list.map((x) => x.id === updated.id ? updated : x))} />) : <div style={emptyCard}>Add a vehicle first from Vehicles.</div>}</>}
          {section === "travel" && <><h2 style={{ marginTop: 0 }}>Travel packages</h2>{packages.map((item, index) => <div key={item.id} style={{ ...whiteCard, padding: 14, marginBottom: 10 }}><div style={fieldGrid}><Field label="Name"><input value={item.name} onChange={(e) => update(setPackages,index,"name",e.target.value)} style={inputStyle}/></Field><Field label="Days"><input type="number" value={item.days} onChange={(e) => update(setPackages,index,"days",Number(e.target.value))} style={inputStyle}/></Field><Field label="Self-drive ₹"><input type="number" value={item.selfDrivePrice} onChange={(e) => update(setPackages,index,"selfDrivePrice",Number(e.target.value))} style={inputStyle}/></Field><Field label="Driver ₹"><input type="number" value={item.driverPrice} onChange={(e) => update(setPackages,index,"driverPrice",Number(e.target.value))} style={inputStyle}/></Field><Field label="Driver + guide ₹"><input type="number" value={item.guidePrice} onChange={(e) => update(setPackages,index,"guidePrice",Number(e.target.value))} style={inputStyle}/></Field></div><Field label="Description"><input value={item.description} onChange={(e) => update(setPackages,index,"description",e.target.value)} style={inputStyle}/></Field></div>)}<button type="button" onClick={saveContent} style={primaryButton}>Save travel packages</button></>}
          {section === "decor" && <><h2 style={{ marginTop: 0 }}>Decorated cars</h2>{decorations.map((item,index) => <div key={item.id} style={{ ...whiteCard, padding: 14, marginBottom: 10 }}><div style={fieldGrid}><Field label="Name"><input value={item.name} onChange={(e) => update(setDecorations,index,"name",e.target.value)} style={inputStyle}/></Field><Field label="Price ₹"><input type="number" value={item.price} onChange={(e) => update(setDecorations,index,"price",Number(e.target.value))} style={inputStyle}/></Field></div><Field label="Description"><input value={item.description} onChange={(e) => update(setDecorations,index,"description",e.target.value)} style={inputStyle}/></Field></div>)}<button type="button" onClick={saveContent} style={primaryButton}>Save decorations</button></>}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   ADMIN GATE
========================================================= */

function AdminGate({
  cars,
  setCars,
  cities,
  setCities,
  bookings,
  leads = [],
}) {
  const [passcode, setPasscode] =
    useState("");

  const [loggedIn, setLoggedIn] =
    useState(false);

  function login(e) {
    e.preventDefault();

    if (
      passcode ===
      ADMIN_PASSCODE
    ) {
      setLoggedIn(true);
      setPasscode("");
    } else {
      alert(
        "Incorrect admin passcode."
      );
    }
  }

    if (loggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", padding: 20 }}>
        <h1 style={{ marginTop: 0 }}>SAWARIYA ADMIN</h1>
        <p>Login OK. Full panel will be restored next.</p>
        <p><b>Cars:</b> {Array.isArray(cars) ? cars.length : 0}</p>
        <p><b>Bookings:</b> {Array.isArray(bookings) ? bookings.length : 0}</p>
        <p><b>Cities:</b> {Array.isArray(cities) ? cities.length : 0}</p>
        <p><b>Leads:</b> {Array.isArray(leads) ? leads.length : 0}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ marginTop: 16, padding: "12px 16px", background: "#2563eb", color: "#fff", border: 0, borderRadius: 12, fontWeight: 800 }}
        >
          Exit Admin
        </button>
      </div>
    );
  }
  
  return (
    <div
      style={{
        minHeight:
          "100vh",
        background:
          "linear-gradient(135deg,#eff6ff,#f8fafc)",
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        padding: 16,
        boxSizing:
          "border-box",
      }}
    >
      <form
        onSubmit={
          login
        }
        style={{
          width:
            "100%",
          maxWidth:
            420,
          background:
            C.white,
          border:
            `1px solid ${C.border}`,
          borderRadius:
            24,
          padding:
            24,
          boxShadow:
            "0 20px 60px rgba(15,23,42,.10)",
          boxSizing:
            "border-box",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius:
              16,
            background:
              C.navy,
            color:
              C.white,
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            marginBottom:
              16,
          }}
        >
          <ShieldCheck
            size={
              27
            }
          />
        </div>

        <h1
          style={{
            margin:
              0,
            fontSize:
              25,
            fontWeight:
              950,
            color:
              C.navy,
          }}
        >
          Admin Login
        </h1>

        <p
          style={{
            color:
              C.gray,
            fontSize:
              13,
            lineHeight:
              1.5,
          }}
        >
          Enter your admin passcode to manage
          vehicles, bookings and cities.
        </p>

        <label
          style={
            labelStyle
          }
        >
          Admin Passcode
        </label>

        <input
          type="password"
          value={
            passcode
          }
          onChange={(
            e
          ) =>
            setPasscode(
              e.target
                .value
            )
          }
          placeholder="Enter passcode"
          style={
            inputStyle
          }
          autoFocus
        />

        <button
          type="submit"
          style={{
            ...primaryButton,
            width:
              "100%",
            marginTop:
              14,
          }}
        >
          <ShieldCheck
            size={
              18
            }
          />
          Login
        </button>

        <div
          style={{
            marginTop:
              12,
            textAlign:
              "center",
            color:
              C.gray,
            fontSize:
              11,
          }}
        >
          SAWARIYA RENTALS
        </div>
      </form>
    </div>
  );
}

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
        const [c, ci, b, l] = await Promise.all([
          fetchCars(),
          fetchCities(),
          fetchBookings(),
          fetchLeads(),
        ]);
        setCars(c);
        const fetchedCities = Array.isArray(ci) ? ci : [];
        const missingCities = seedCities.filter((seed) => !fetchedCities.some((city) => city.name === seed.name));
        setCities([...fetchedCities, ...missingCities]);
        if (b.length) setBookings(b);
        setLeads(Array.isArray(l) ? l : []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

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
      <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", padding: 20 }}>
        <h1 style={{ marginTop: 0 }}>SAWARIYA ADMIN</h1>
        <p>Admin shell OK (no login gate).</p>
        <p><b>Cars:</b> {Array.isArray(cars) ? cars.length : 0}</p>
        <p><b>Bookings:</b> {Array.isArray(bookings) ? bookings.length : 0}</p>
        <p><b>Cities:</b> {Array.isArray(cities) ? cities.length : 0}</p>
        <button
          type="button"
          onClick={() => setIsAdmin(false)}
          style={{ marginTop: 16, padding: "12px 16px", background: "#2563eb", color: "#fff", border: 0, borderRadius: 12, fontWeight: 800 }}
        >
          Exit Admin
        </button>
      </div>
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
