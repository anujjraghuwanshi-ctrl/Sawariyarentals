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
  ChevronLeft,
  ChevronRight,
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

/* =========================================================
   CUSTOMER VIEW
========================================================= */

function CustomerView({
  cars,
  cities,
  bookings,
  onBook,
}) {
  const [selectedCity, setSelectedCity] =
    useState("All");

  const [search, setSearch] =
    useState("");

  const [bookingCar, setBookingCar] =
    useState(null);
  const [page, setPage] = useState("app");
const [zoom, setZoom] = useState(null);

    const [loginOpen, setLoginOpen] = useState(false);
  const [customerProfile, setCustomerProfile] = useState(() =>
    loadShared("sawariya_customer_profile", null)
  );
  
  const activeCities =
    cities.filter(
      (city) => city.active
    );

  const filteredCars =
    useMemo(() => {
      return cars.filter(
        (car) => {
          const cityMatch =
            selectedCity ===
              "All" ||
            car.city ===
              selectedCity;

          const searchText =
            search
              .trim()
              .toLowerCase();

          const searchMatch =
            !searchText ||
            car.name
              .toLowerCase()
              .includes(
                searchText
              ) ||
            car.type
              .toLowerCase()
              .includes(
                searchText
              ) ||
            car.city
              .toLowerCase()
              .includes(
                searchText
              );

          return (
            cityMatch &&
            searchMatch
          );
        }
      );
    }, [
      cars,
      selectedCity,
      search,
    ]);

  function handleConfirmBooking(
    data
  ) {
    onBook(data);
    setBookingCar(null);
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
      {/* HEADER */}

      <header
        style={{
          position:
            "sticky",
          top: 0,
          zIndex: 50,
          background:
            "rgba(255,255,255,.96)",
          backdropFilter:
            "blur(12px)",
          borderBottom:
            `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            maxWidth:
              1200,
            margin:
              "0 auto",
            padding:
              "14px 16px",
            display:
              "flex",
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
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius:
                  13,
                background:
                  C.blue,
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                flexShrink: 0,
              }}
            >
              <Car
                color="white"
                size={23}
              />
            </div>

            <div
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontWeight:
                    1000,
                  fontSize: 18,
                  color:
                    C.navy,
                  lineHeight:
                    1.1,
                }}
              >
                SAWARIYA
              </div>

              <div
                style={{
                  fontSize: 10,
                  color:
                    C.blue,
                  fontWeight:
                    900,
                  letterSpacing:
                    1,
                }}
              >
                                RENTALS
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1.4,
                }}
              >
                <a href="tel:+917415228011" style={{ color: C.blue, textDecoration: "none" }}>
                  74152 28011
                </a>
                {" · "}
                <a href="tel:+918982802145" style={{ color: C.blue, textDecoration: "none" }}>
                  89828 02145
                </a>
                <br />
                <a
                  href="https://wa.me/917415228011"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: C.green, textDecoration: "none" }}
                >
                  WhatsApp
                </a>
                {" · "}
                <a
                  href="https://maps.app.goo.gl/7wp7CfqBHhb1BbDm9?g_st=ic"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: C.navy, textDecoration: "none" }}
                >
                  Sawariya Rentals location
                </a>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a href="#cars" style={{ textDecoration: "none", color: C.navy, fontWeight: 800, fontSize: 14 }}>Browse Cars</a>
            <button type="button" onClick={() => setLoginOpen(true)} style={secondaryButton}>
              {customerProfile?.name ? `Hi, ${customerProfile.name.split(" ")[0]}` : "Login"}
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}

      <section
        style={{
          background:
            "linear-gradient(135deg,#eff6ff 0%,#ffffff 55%,#f0fdf4 100%)",
          padding:
            "48px 16px 38px",
        }}
      >
        <div
          style={{
            maxWidth:
              1000,
            margin:
              "0 auto",
            textAlign:
              "center",
          }}
        >
          <Badge color={C.blue}>
            <Car size={13} />
            Easy Car Rental
          </Badge>

          <h1
            style={{
              margin:
                "16px auto 10px",
              maxWidth:
                760,
              fontSize:
                "clamp(32px, 7vw, 58px)",
              lineHeight:
                1.05,
              fontWeight:
                1000,
              color:
                C.navy,
            }}
          >
            Rent a Car.
            <br />
            <span
              style={{
                color:
                  C.blue,
              }}
            >
              Drive Your Way.
            </span>
          </h1>

          <p
            style={{
              maxWidth:
                650,
              margin:
                "0 auto",
              color:
                C.gray,
              fontSize:
                16,
              lineHeight:
                1.6,
            }}
          >
            Affordable and reliable
            self-drive car rentals
            from SAWARIYA RENTALS.
          </p>

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "center",
              flexWrap:
                "wrap",
              gap: 8,
              marginTop:
                18,
            }}
          >
            <Badge color={C.blue}>
              <Clock3 size={13} />
              8 Hour Rentals
            </Badge>

            <Badge color={C.green}>
              <Clock3 size={13} />
              12 Hour Rentals
            </Badge>

            <Badge color={C.orange}>
              <Clock3 size={13} />
              24 Hour Rentals
            </Badge>
          </div>
        </div>
      </section>

      {/* REVV-STYLE PLAN STRIP */}
      {(() => {
        const business = loadShared("sawariya_business_settings", DEFAULT_BUSINESS_SETTINGS);
        const packages = loadShared("sawariya_travel_packages", DEFAULT_TRAVEL_PACKAGES);
        const decorations = loadShared("sawariya_decorations", DEFAULT_DECORATIONS);
        return (
          <>
            <section style={{ maxWidth: 1200, margin: "0 auto", padding: "8px 16px 18px" }}>
              <div style={{ display: "flex", overflowX: "auto", gap: 10, paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
                {[
                  ["Hourly", fmtINR(business.hourlyStartingPrice) + "/hr", `${business.hourlyIncludedKm} km included`],
                  ["Daily", fmtINR(business.dailyStartingPrice) + "/day", `${business.dailyIncludedKm} km included`],
                  ["Weekly", fmtINR(business.weeklyStartingPrice) + "/week", "Best for longer trips"],
                  ["Monthly", fmtINR(business.monthlyStartingPrice) + "/month", "1-month plan"],
                  ["2-Year Offer", fmtINR(business.longTermMonthlyPrice) + "/month", `${business.longTermMonths}-month commitment`],
                ].map(([title, price, note]) => (
                  <div key={title} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, padding: 16, boxShadow: "0 8px 25px rgba(15,23,42,.05)", minWidth: 150, flex: "0 0 auto" }}>
                    <div style={{ color: C.gray, fontSize: 12, fontWeight: 800 }}>{title}</div>
                    <div style={{ fontSize: 22, fontWeight: 950, marginTop: 5 }}>{price}</div>
                    <div style={{ color: C.gray, fontSize: 12, marginTop: 4 }}>{note}</div>
                  </div>
                ))}
              </div>
            </section>
            <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", marginBottom: 12 }}><div><h2 style={{ margin: 0, fontSize: 24 }}>Travel packages</h2><p style={{ margin: "4px 0 0", color: C.gray, fontSize: 13 }}>Ujjain, Omkareshwar, Mandu and more — self-drive, driver or guide.</p></div></div>
                            <div style={{ display: "flex", overflowX: "auto", gap: 10, paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
                {packages.map((item) => (
                  <div key={item.id} style={{ ...whiteCard, padding: 16, minWidth: 150, flex: "0 0 auto" }}>
                    <Badge color={C.blue}>{item.days} day{item.days === 1 ? "" : "s"}</Badge>
                    <h3 style={{ margin: "10px 0 5px" }}>{item.name}</h3>
                    <p style={{ margin: 0, color: C.gray, fontSize: 13, lineHeight: 1.5 }}>{item.description}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                      <Badge color={C.green}>Self drive</Badge>
                      <Badge color={C.orange}>Driver</Badge>
                      <Badge color={C.blue}>Guide</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", marginBottom: 12 }}><div><h2 style={{ margin: 0, fontSize: 24 }}>Decorated cars</h2><p style={{ margin: "4px 0 0", color: C.gray, fontSize: 13 }}>Birthday, wedding, anniversary, proposal and custom.</p></div></div>
                            <div style={{ display: "flex", overflowX: "auto", gap: 10, paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
                {decorations.map((item) => (
                  <div key={item.id} style={{ ...whiteCard, padding: 16, minWidth: 150, flex: "0 0 auto" }}>
                    <div style={{ fontSize: 32 }}>🎉</div>
                    <h3 style={{ margin: "8px 0 5px" }}>{item.name}</h3>
                    <p style={{ margin: 0, color: C.gray, fontSize: 13 }}>{item.description}</p>
                    <div style={{ marginTop: 10, fontWeight: 900 }}>
                      {item.price ? `From ${fmtINR(item.price)}` : "Custom price"}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        );
      })()}

{/* SEARCH / FILTER */}

      <section
        id="cars"
        style={{
          maxWidth:
            1200,
          margin:
            "0 auto",
          padding:
            "22px 16px",
        }}
      >
        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              position:
                "relative",
            }}
          >
            <Search
              size={18}
              color={
                C.gray
              }
              style={{
                position:
                  "absolute",
                left: 14,
                top: "50%",
                transform:
                  "translateY(-50%)",
              }}
            />

            <input
              value={
                search
              }
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search cars..."
              style={{
                ...inputStyle,
                paddingLeft:
                  42,
              }}
            />
          </div>

          <select
            value={
              selectedCity
            }
            onChange={(e) =>
              setSelectedCity(
                e.target.value
              )
            }
            style={
              inputStyle
            }
          >
            <option value="All">
              All Cities
            </option>

            {activeCities.map(
              (city) => (
                <option
                  key={
                    city.id
                  }
                  value={
                    city.name
                  }
                >
                  {city.name}
                </option>
              )
            )}
          </select>
        </div>
      </section>

      {/* CARS */}

      <main
        style={{
          maxWidth:
            1200,
          margin:
            "0 auto",
          padding:
            "0 16px 60px",
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
            gap: 12,
            marginBottom:
              18,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 25,
                fontWeight:
                  950,
              }}
            >
              Available Cars
            </h2>

            <p
              style={{
                margin:
                  "5px 0 0",
                color:
                  C.gray,
                fontSize:
                  13,
              }}
            >
              {filteredCars.length}{" "}
              car
              {filteredCars.length !==
              1
                ? "s"
                : ""}{" "}
              found
            </p>
          </div>
        </div>

        {filteredCars.length ===
        0 ? (
          <div
            style={{
              padding:
                40,
              background:
                C.white,
              border:
                `1px solid ${C.border}`,
              borderRadius:
                20,
              textAlign:
                "center",
              color:
                C.gray,
            }}
          >
            <Car
              size={48}
              color={
                C.blue
              }
              strokeWidth={
                1.3
              }
            />

            <h3
              style={{
                color:
                  C.navy,
                margin:
                  "12px 0 5px",
              }}
            >
              No cars available yet
            </h3>

            <p
              style={{
                margin:
                  0,
                fontSize:
                  13,
              }}
            >
              Vehicles added by the
              admin will appear here.
            </p>
          </div>
        ) : (
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns: "1fr",
              gap: 12
            }}
          >
            {filteredCars.map(
              (car) => (
                <CarCard
                  key={
                    car.id
                  }
                  car={
                    car
                  }
                  onBook={(car) => {
  setBookingCar(car);
  setPage("story");
}}
                />
              )
            )}
          </div>
        )}

        {/* RECENT BOOKINGS */}

        {bookings.length >
          0 && (
          <section
            style={{
              marginTop:
                40,
            }}
          >
            <h2
              style={{
                margin:
                  "0 0 14px",
                fontSize:
                  22,
                fontWeight:
                  950,
              }}
            >
              Recent Bookings
            </h2>

            <div
              style={{
                display:
                  "grid",
                gap: 10,
              }}
            >
              {bookings
                .slice()
                .reverse()
                .slice(0, 5)
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
                          16,
                        padding:
                          15,
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
                        <strong>
                          {
                            booking.carName
                          }
                        </strong>

                        <div
                          style={{
                            color:
                              C.gray,
                            fontSize:
                              12,
                            marginTop:
                              4,
                          }}
                        >
                          {
                            booking.name
                          }{" "}
                          •{" "}
                          {
                            booking.pickupDate
                          }{" "}
                          •{" "}
                          {
                            booking.rentalDuration
                          }{" "}
                          hours
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
                            fontWeight:
                              900,
                            color:
                              C.green,
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
                              C.gray,
                            fontSize:
                              12,
                          }}
                        >
                          Remaining{" "}
                          {fmtINR(
                            booking.remainingAmount
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
            </div>
                    </section>
        )}

        <div style={{ maxWidth: 1000, margin: "8px auto 36px", padding: "0 16px" }}>
          <h3 style={{ margin: "0 0 10px", color: C.navy, fontWeight: 900 }}>
            Sawariya Rentals location
          </h3>
          <p style={{ margin: "0 0 12px", color: C.gray, fontSize: 14 }}>
            Indore · Call 74152 28011 / 89828 02145
          </p>
          <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}` }}>
            <iframe
              title="Sawariya Rentals location"
              src="https://maps.google.com/maps?q=22.7525840,75.8916329&z=16&output=embed"
              width="100%"
              height="260"
              style={{ border: 0 }}
              loading="lazy"
            />
          </div>
        </div>
      </main>
            {page === "story" && bookingCar && (
        <div style={{ position: "fixed", inset: 0, background: "#f8fafc", color: "#0f172a", overflow: "auto", zIndex: 80 }}>
          <div style={{ background: "#0f172a", color: "#fff", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button type="button" onClick={() => { setPage("app"); setBookingCar(null); }} style={{ background: "none", border: 0, color: "#fff" }}>← Back</button>
            <strong>Sawariya Rentals</strong>
            <a href="https://wa.me/917415228011" style={{ color: "#fff", textDecoration: "none", fontSize: 13 }}>WhatsApp</a>
          </div>

          <div style={{ padding: 16, maxWidth: 720, margin: "0 auto 40px" }}>
            <h2 style={{ margin: "8px 0 4px" }}>{bookingCar.name}</h2>
            <p style={{ color: "#64748b", margin: "0 0 12px" }}>{bookingCar.type} · Indore · Self drive</p>

            <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
              {(bookingCar.photos || []).map((src) => (
                <img key={src} src={src} alt="" onClick={() => setZoom(src)} style={{ height: 170, borderRadius: 14 }} />
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#64748b" }}>Tap photo to zoom</p>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, marginTop: 14 }}>
              <h3 style={{ margin: "0 0 8px" }}>About Sawariya Rentals</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
                Self-drive car rental in Indore. Clean cars, clear rates, WhatsApp support.
                Book 8 / 12 / 24 hours or several days.
              </p>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, marginTop: 12 }}>
              <h3 style={{ margin: "0 0 8px" }}>Why we are best</h3>
              <div>✓ Clean, maintained cars</div>
              <div>✓ Fair Indore pricing</div>
              <div>✓ 24×7 customer service</div>
              <div>✓ Same-day booking if available</div>
              <div>✓ Easy extend on WhatsApp</div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, marginTop: 12 }}>
              <h3 style={{ margin: "0 0 8px" }}>Our services</h3>
              <div>• Self drive hatchback, SUV, CNG</div>
              <div>• 8 / 12 / 24 hour packages</div>
              <div>• Multi-day outstation</div>
              <div>• Airport pickup and drop (IDR)</div>
              <div>• 24×7 call / WhatsApp help</div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, marginTop: 12 }}>
              <h3 style={{ margin: "0 0 8px" }}>Airport pickup & drop</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
                Devi Ahilya Bai Holkar Airport (IDR). Share flight time on WhatsApp.
                We arrange pickup or drop with the booked car.
              </p>
            </div>
            <button type="button" onClick={() => setPage("app")} style={{ width: "100%", padding: 14, border: 0, borderRadius: 12, background: "#2563eb", color: "#fff", fontWeight: 800 }}>
              Book this car
            </button>
          </div>

            <a href="https://wa.me/917415228011?text=Hi%20Sawariya%20Rentals" style={{ display: "block", textAlign: "center", background: "#25D366", color: "#fff", padding: 14, borderRadius: 12, fontWeight: 800, textDecoration: "none", marginTop: 14 }}>
              WhatsApp us · 74152 28011
            </a>
            <p style={{ textAlign: "center", fontSize: 13, color: "#64748b" }}>or call 89828 02145</p>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
              <h3 style={{ margin: 0 }}>Reviews</h3>
              <button type="button" onClick={() => setPage("reviews")} style={{ background: "none", border: 0, color: "#2563eb", fontWeight: 700 }}>Sab reviews →</button>
            </div>
            <div style={{ display: "flex", overflowX: "auto", gap: 10, padding: "8px 0 16px" }}>
              {PAGE_REVIEWS.map((r, i) => (
                <div key={i} style={{ minWidth: 230, background: "#fff", border: "1px solid #e2e8f0", padding: 12, borderRadius: 14 }}>
                  <div style={{ color: "#ca8a04" }}>{STARS(r.s)}</div>
                  <div style={{ fontSize: 14, margin: "8px 0" }}>{r.t}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{r.n} · {r.p}</div>
                </div>
              ))}
            </div>

          {zoom && (
            <div onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99 }}>
              <img src={zoom} alt="" style={{ maxWidth: "94%", maxHeight: "90%" }} />
            </div>
          )}
        </div>
      )}

      {page === "reviews" && (
        <div style={{ position: "fixed", inset: 0, background: "#f8fafc", color: "#0f172a", overflow: "auto", zIndex: 80 }}>
          <div style={{ background: "#0f172a", color: "#fff", padding: "14px 16px" }}>
            <button type="button" onClick={() => setPage("story")} style={{ background: "none", border: 0, color: "#fff" }}>← Back</button>
          </div>
          <div style={{ padding: 16 }}>
            <h2>Customer reviews</h2>
            <p style={{ color: "#64748b" }}>Sawariya Rentals · Indore</p>
            {PAGE_REVIEWS.map((r, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", padding: 14, borderRadius: 14, marginBottom: 10 }}>
                <div style={{ color: "#ca8a04" }}>{STARS(r.s)}</div>
                <div style={{ margin: "8px 0" }}>{r.t}</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>{r.n} · {r.p}</div>
              </div>
            ))}
          </div>
        </div>
      )}
  
      {loginOpen && (
        <div style={modalBackdrop}>
          <div style={{ ...modalCard, maxWidth: 430 }}>
            <div style={modalHeader}><div><Badge color={C.blue}>Customer account</Badge><h2 style={{ margin: "8px 0 0" }}>Quick login</h2></div><button type="button" onClick={() => setLoginOpen(false)} style={iconButton}><X size={18}/></button></div>
            <div style={{ padding: 18, display: "grid", gap: 12 }}>
              <Field label="Name"><input id="customer-name" defaultValue={customerProfile?.name || ""} style={inputStyle}/></Field>
              <Field label="Mobile"><input id="customer-phone" defaultValue={customerProfile?.phone || ""} inputMode="numeric" style={inputStyle}/></Field>
              <button type="button" style={primaryButton} onClick={() => { const name = document.getElementById("customer-name")?.value?.trim() || ""; const phone = document.getElementById("customer-phone")?.value?.replace(/\D/g, "") || ""; if (!name || !/^\d{10}$/.test(phone)) return alert("Enter your name and valid 10-digit mobile number."); const profile = { name, phone }; saveShared("sawariya_customer_profile", profile); setCustomerProfile(profile); setLoginOpen(false); }}>Save profile</button>
              <div style={{ fontSize: 12, color: C.gray }}>This is a quick profile for easier booking. It is not OTP-based authentication.</div>
            </div>
          </div>
        </div>
      )}

      {page === "app" && bookingCar && (
        <BookingModal
          car={
            bookingCar
          }
          onClose={() =>
            setBookingCar(
              null
            )
          }
          onConfirm={
            handleConfirmBooking
          }
        />
      )}
    </div>
  );
}

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
