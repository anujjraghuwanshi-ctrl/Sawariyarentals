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

const ADMIN_PASSCODE = String(import.meta.env.VITE_ADMIN_PASSCODE || "").trim();
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


const defaultBusinessSettings = {
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

const defaultTravelPackages = [
  {id:"ujjain",name:"Ujjain Visit",days:1,description:"Mahakal Lok, Mahakaleshwar and major Ujjain sights.",selfDrivePrice:0,driverPrice:0,guidePrice:0},
  {id:"omkareshwar",name:"Omkareshwar Visit",days:1,description:"Omkareshwar Jyotirlinga and Narmada visit.",selfDrivePrice:0,driverPrice:0,guidePrice:0},
  {id:"mandu",name:"Mandu Visit",days:1,description:"Historic Mandu, Jahaz Mahal and heritage sites.",selfDrivePrice:0,driverPrice:0,guidePrice:0},
  {id:"maheshwar",name:"Maheshwar Visit",days:1,description:"Narmada ghats and Ahilya Fort.",selfDrivePrice:0,driverPrice:0,guidePrice:0},
  {id:"indore",name:"Indore City Tour",days:1,description:"Rajwada, Sarafa, Chappan Dukan and city highlights.",selfDrivePrice:0,driverPrice:0,guidePrice:0},
  {id:"pachmarhi",name:"Pachmarhi Trip",days:2,description:"A longer getaway with flexible vehicle and driver options.",selfDrivePrice:0,driverPrice:0,guidePrice:0},
];
const defaultDecorations = [
  {id:"birthday",name:"Birthday Car Decoration",description:"Balloons, ribbons and custom birthday message.",price:0},
  {id:"wedding",name:"Wedding Car Decoration",description:"Wedding-ready decoration with customizable theme.",price:0},
  {id:"anniversary",name:"Anniversary Decoration",description:"Flowers, ribbons and custom message.",price:0},
  {id:"proposal",name:"Proposal Decoration",description:"Custom romantic decoration for a special moment.",price:0},
  {id:"custom",name:"Custom Decoration",description:"Tell us your theme, colours and message.",price:0},
];
const CITY_COORDS = {Indore:[22.7196,75.8577],Bhopal:[23.2599,77.4126],Ujjain:[23.1765,75.7885],Omkareshwar:[22.2425,76.1487],Mandu:[22.3333,75.4],Maheshwar:[22.176,75.583],Pachmarhi:[22.4674,78.4346]};
function calculateRoute(from,to){ if(!from||!to||from===to||!CITY_COORDS[from]||!CITY_COORDS[to]) return null; const [lat1,lon1]=CITY_COORDS[from], [lat2,lon2]=CITY_COORDS[to]; const R=6371; const p1=lat1*Math.PI/180,p2=lat2*Math.PI/180,dp=(lat2-lat1)*Math.PI/180,dl=(lon2-lon1)*Math.PI/180; const a=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2; const straight=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); const distanceKm=Math.max(1,Math.round(straight*1.18)); const hours=Math.max(1,Math.round((distanceKm/45)*10)/10); return {distanceKm,hours}; }
function defaultFuelCostPerKm(fuel,settings){ const f=String(fuel||"").toLowerCase(); if(f.includes("cng")) return Number(settings.cngCostPerKm||4.5); if(f.includes("diesel")) return Number(settings.dieselCostPerKm||9.25); return Number(settings.petrolCostPerKm||7.5); }

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

function CarCard({
  car,
  onBook,
}) {
  const [photoIndex, setPhotoIndex] =
    useState(0);

  const photos = car.photos || [];

  const currentPhoto =
    photos.length > 0
      ? photos[photoIndex % photos.length]
      : null;

  const price8 =
    Number(car.price8 || 0);

  const price12 =
    Number(
      car.price12 ||
        car.price ||
        0
    );

  const price24 =
    Number(car.price24 || 0);

  return (
    <div
      style={{
        background: C.white,
        border:
          `1px solid ${C.border}`,
        borderRadius: 22,
        overflow: "hidden",
        boxShadow:
          "0 8px 30px rgba(15,23,42,.06)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 10",
          background:
            "linear-gradient(135deg,#dbeafe,#f8fafc)",
          overflow: "hidden",
        }}
      >
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt={car.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Car
              size={80}
              color={C.blue}
              strokeWidth={1.2}
            />
          </div>
        )}

        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
          }}
        >
          {car.available ? (
            <Badge color={C.green}>
              <CheckCircle2 size={13} />
              Available
            </Badge>
          ) : (
            <Badge color={C.red}>
              <Clock3 size={13} />
              Rented
            </Badge>
          )}
        </div>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setPhotoIndex(
                  (photoIndex -
                    1 +
                    photos.length) %
                    photos.length
                )
              }
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform:
                  "translateY(-50%)",
                width: 34,
                height: 34,
                borderRadius: 999,
                border: "none",
                background:
                  "rgba(255,255,255,.9)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() =>
                setPhotoIndex(
                  (photoIndex + 1) %
                    photos.length
                )
              }
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform:
                  "translateY(-50%)",
                width: 34,
                height: 34,
                borderRadius: 999,
                border: "none",
                background:
                  "rgba(255,255,255,.9)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      <div style={{ padding: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent:
              "space-between",
            gap: 10,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                color: C.navy,
                fontSize: 19,
                fontWeight: 900,
              }}
            >
              {car.name}
            </h3>

            <div
              style={{
                marginTop: 5,
                color: C.gray,
                fontSize: 13,
              }}
            >
              {car.type} • {car.city}
            </div>
          </div>
        </div>

        {/* DURATION PRICES */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0,1fr))",
            gap: 8,
            marginTop: 14,
          }}
        >
          <div
            style={{
              padding: 10,
              borderRadius: 12,
              background: C.sky,
              border:
                `1px solid #dbeafe`,
            }}
          >
            <div
              style={{
                color: C.gray,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              8 HOURS
            </div>

            <strong
              style={{
                color: C.blue,
                fontSize: 17,
              }}
            >
              {fmtINR(price8)}
            </strong>
          </div>

          <div
            style={{
              padding: 10,
              borderRadius: 12,
              background: C.greenLight,
              border:
                `1px solid #bbf7d0`,
            }}
          >
            <div
              style={{
                color: C.gray,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              12 HOURS
            </div>

            <strong
              style={{
                color: C.green,
                fontSize: 17,
              }}
            >
              {fmtINR(price12)}
            </strong>
          </div>

          <div
            style={{
              padding: 10,
              borderRadius: 12,
              background: C.orangeLight,
              border:
                `1px solid #fed7aa`,
            }}
          >
            <div
              style={{
                color: C.gray,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              24 HOURS
            </div>

            <strong
              style={{
                color: C.orange,
                fontSize: 17,
              }}
            >
              {fmtINR(price24)}
            </strong>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 7,
            marginTop: 14,
          }}
        >
          <Badge color={C.gray}>
            <User size={12} />
            {car.seats} Seats
          </Badge>

          <Badge color={C.gray}>
            {car.fuel}
          </Badge>

          <Badge color={C.gray}>
            {car.transmission}
          </Badge>
        </div>

        <button
          type="button"
          onClick={() => onBook(car)}
          disabled={!car.available}
          style={{
            ...primaryButton,
            width: "100%",
            marginTop: 18,
            opacity:
              car.available ? 1 : 0.5,
            cursor:
              car.available
                ? "pointer"
                : "not-allowed",
          }}
        >
          {car.available
            ? "Book This Car"
            : "Currently Rented"}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   BOOKING MODAL
========================================================= */

function BookingModal({ car, onClose, onConfirm }) {
  const [tripType, setTripType] = useState("round");
  const [serviceType, setServiceType] = useState("self");
  const [fuelOption, setFuelOption] = useState("customer");
  const [pickupCity, setPickupCity] = useState(car?.city || "Indore");
  const [dropCity, setDropCity] = useState("");
  const [pickupDate, setPickupDate] = useState(todayISO());
  const [pickupTime, setPickupTime] = useState("09:00");
  const [hours, setHours] = useState(1);
  const [days, setDays] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentType, setPaymentType] = useState("advance");
  const [loading, setLoading] = useState(false);

  const settings = loadShared("sawariya_business_settings", defaultBusinessSettings);
  const cleanPhone = phone.replace(/\D/g, "");

  const route = useMemo(() => calculateRoute(pickupCity, dropCity), [pickupCity, dropCity]);
  const hourlyRate = Number(car?.hourlyRate ?? settings.hourlyStartingPrice ?? 83);
  const dailyRate = Number(car?.price24 ?? car?.dailyRate ?? settings.dailyStartingPrice ?? 2200);
  const weeklyRate = Number(car?.weeklyRate ?? settings.weeklyStartingPrice ?? 8500);
  const monthlyRate = Number(car?.monthlyRate ?? settings.monthlyStartingPrice ?? 40000);
  const longTermRate = Number(car?.longTermRate ?? settings.longTermMonthlyPrice ?? 18000);
  const includedHourlyKm = Number(car?.hourlyKm ?? settings.hourlyIncludedKm ?? 20);
  const includedDailyKm = Number(car?.dailyKm ?? settings.dailyIncludedKm ?? 280);
  const extraKmRate = Number(car?.extraKmRate ?? settings.extraKmRate ?? 6);
  const driverDayCost = Number(car?.driverCost ?? settings.driverCostPerDay ?? 1000);
  const fuelCostPerKm = Number(car?.fuelCostPerKm ?? defaultFuelCostPerKm(car?.fuel, settings));

  let rental = 0;
  let includedKm = 0;
  if (days > 1) {
    rental = (days >= 7 ? weeklyRate * Math.floor(days / 7) + dailyRate * (days % 7) : dailyRate * days);
    includedKm = includedDailyKm * days;
  } else {
    rental = hourlyRate * Math.max(1, Math.min(24, Number(hours) || 1));
    includedKm = includedHourlyKm * Math.max(1, Number(hours) || 1);
    if (Number(hours) >= 24) {
      rental = dailyRate;
      includedKm = includedDailyKm;
    }
  }

  const tripKm = tripType === "oneway" && route ? route.distanceKm : 0;
  const returnKm = tripType === "oneway" && route ? route.distanceKm : 0;
  const customerExtraKm = Math.max(0, tripKm - includedKm);
  const extraKmCost = customerExtraKm * extraKmRate;
  const fuelCost = fuelOption === "business" ? tripKm * fuelCostPerKm : 0;
  const driverCost = serviceType === "driver" || serviceType === "guide" ? driverDayCost * Math.max(1, Math.ceil((route?.hours || 1) / 8)) : 0;
  const guideCost = serviceType === "guide" ? Number(settings.guideCostPerDay || 800) * Math.max(1, Math.ceil((route?.hours || 1) / 8)) : 0;
  const returnFuelCost = tripType === "oneway" && serviceType !== "self" ? returnKm * fuelCostPerKm : 0;
  const returnTimeCost = tripType === "oneway" && serviceType !== "self" ? Number(settings.returnTimeCostPerHour || 250) * Math.max(1, Math.ceil((route?.hours || 1))) : 0;
  const deliveryCost = Number(settings.deliveryFlatCharge || 0);
  const baseSubtotal = rental + extraKmCost + fuelCost + driverCost + guideCost + deliveryCost + returnFuelCost + returnTimeCost;
  const margin = baseSubtotal * (Number(settings.marginPercent || 10) / 100);
  const total = Math.max(0, Math.round(baseSubtotal + margin));
  const advance = Math.min(Number(settings.bookingAdvance || 500), total);
  const paymentAmount = paymentType === "advance" ? advance : total;
  const remaining = Math.max(0, total - paymentAmount);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return alert("Please enter your name.");
    if (!/^\d{10}$/.test(cleanPhone)) return alert("Please enter a valid 10-digit mobile number.");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return alert("Please enter a valid email address.");
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
        email: email.trim().toLowerCase(),
        pickupDate,
        pickupTime,
        tripType,
        serviceType,
        pickupCity,
        dropCity,
        routeDistanceKm: tripKm,
        estimatedTravelHours: route?.hours || null,
        fuelOption,
        rentalHours: Number(hours),
        rentalDays: Number(days),
        total,
        paidAmount: paymentAmount,
        advancePaid: paymentType === "advance" ? paymentAmount : 0,
        remainingAmount: remaining,
        paymentType,
        status: "Pending",
        pricingBreakdown: { rental, extraKmCost, fuelCost, driverCost, guideCost, returnFuelCost, returnTimeCost, deliveryCost, margin },
      };

      localStorage.setItem("sawariya_pending_booking", JSON.stringify(pendingBooking));

      const response = await fetch("/api/payu-create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          productinfo: `${tripType === "oneway" ? "One Way" : "Rental"} - ${car.name}`,
          firstname: name.trim(),
          email: email.trim().toLowerCase(),
          phone: cleanPhone,
          reference: `${car.id}-${Date.now()}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !data?.paymentUrl || !data?.formData) {
        throw new Error(data?.message || "Unable to create PayU payment.");
      }
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.paymentUrl;
      form.style.display = "none";
      Object.entries(data.formData).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value ?? "";
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error(error);
      alert(error?.message || "Something went wrong while starting payment.");
      setLoading(false);
    }
  }

  return (
    <div style={modalOverlay}>
      <form onSubmit={handleSubmit} style={modalCard}>
        <div style={modalHeader}>
          <div><div style={{fontSize:12,color:C.blue,fontWeight:900}}>BOOK YOUR CAR</div><h2 style={{margin:"4px 0 0"}}>{car.name}</h2></div>
          <button type="button" onClick={onClose} style={iconButton}><X size={20}/></button>
        </div>
        <div style={{padding:20,display:"grid",gap:16}}>
          <div style={choiceGrid}>
            <Choice active={tripType === "round"} onClick={() => setTripType("round")} title="Round Trip" text="Return the car" />
            <Choice active={tripType === "oneway"} onClick={() => setTripType("oneway")} title="One Way" text="Go to another city" />
          </div>
          <div style={choiceGrid}>
            <Choice active={serviceType === "self"} onClick={() => setServiceType("self")} title="Self Drive" text="You drive" />
            <Choice active={serviceType === "driver"} onClick={() => setServiceType("driver")} title="With Driver" text="Driver included" />
            <Choice active={serviceType === "guide"} onClick={() => setServiceType("guide")} title="Driver + Guide" text="For tours" />
          </div>
          <div style={fieldGrid}>
            <Field label="Pickup city"><select value={pickupCity} onChange={e=>setPickupCity(e.target.value)} style={inputStyle}><option>Indore</option><option>Bhopal</option></select></Field>
            {tripType === "oneway" && <Field label="Destination"><select value={dropCity} onChange={e=>setDropCity(e.target.value)} style={inputStyle}><option value="">Select destination</option>{Object.keys(CITY_COORDS).filter(x=>x!==pickupCity).map(x=><option key={x}>{x}</option>)}</select></Field>}
            <Field label="Pickup date"><input type="date" min={todayISO()} value={pickupDate} onChange={e=>setPickupDate(e.target.value)} style={inputStyle}/></Field>
            <Field label="Pickup time"><input type="time" value={pickupTime} onChange={e=>setPickupTime(e.target.value)} style={inputStyle}/></Field>
          </div>
          <div style={choiceGrid}>
            <Field label="Rental hours"><input type="number" min="1" max="24" value={hours} onChange={e=>setHours(e.target.value)} style={inputStyle}/></Field>
            <Field label="Rental days"><input type="number" min="1" value={days} onChange={e=>setDays(e.target.value)} style={inputStyle}/></Field>
          </div>
          {route && <div style={infoBox}><strong>{route.distanceKm} km estimated distance</strong><span>Approx. {route.hours} hours driving time</span></div>}
          <div><div style={labelStyle}>Fuel</div><div style={choiceGrid}><Choice active={fuelOption === "customer"} onClick={()=>setFuelOption("customer")} title="I will pay/refill fuel" text="Fuel charged to customer"/><Choice active={fuelOption === "business"} onClick={()=>setFuelOption("business")} title="Add fuel cost" text="Estimated automatically"/></div></div>
          <div style={fieldGrid}><Field label="Full name"><input value={name} onChange={e=>setName(e.target.value)} style={inputStyle}/></Field><Field label="Mobile"><input value={phone} onChange={e=>setPhone(e.target.value)} inputMode="numeric" style={inputStyle}/></Field><Field label="Email"><input value={email} onChange={e=>setEmail(e.target.value)} type="email" style={inputStyle}/></Field></div>
          <div style={summaryBox}>
            <div style={summaryRow}><span>Rental</span><strong>{fmtINR(rental)}</strong></div>
            <div style={summaryRow}><span>Extra km</span><strong>{fmtINR(extraKmCost)}</strong></div>
            <div style={summaryRow}><span>Fuel</span><strong>{fuelOption === "customer" ? "Customer pays" : fmtINR(fuelCost)}</strong></div>
            {serviceType !== "self" && <div style={summaryRow}><span>Driver / guide</span><strong>{fmtINR(driverCost + guideCost)}</strong></div>}
            {tripType === "oneway" && <div style={summaryRow}><span>Return/recovery</span><strong>{fmtINR(returnFuelCost + returnTimeCost)}</strong></div>}
            <div style={summaryRow}><span>Margin</span><strong>{fmtINR(margin)}</strong></div>
            <div style={{...summaryRow,fontSize:18,borderTop:`1px solid ${C.border}`,paddingTop:10}}><span>Total</span><strong style={{color:C.blue}}>{fmtINR(total)}</strong></div>
          </div>
          <div style={choiceGrid}><Choice active={paymentType === "advance"} onClick={()=>setPaymentType("advance")} title={`Pay ${fmtINR(advance)}`} text="Booking advance"/><Choice active={paymentType === "full"} onClick={()=>setPaymentType("full")} title={`Pay ${fmtINR(total)}`} text="Full payment"/></div>
          <button disabled={loading} style={{...primaryButton,width:"100%",opacity:loading?.65:1}}>{loading ? "Opening payment…" : `Continue to PayU · ${fmtINR(paymentAmount)}`}</button>
          <div style={{fontSize:12,color:C.gray,textAlign:"center"}}>Minimum rental age: 18 years · Valid driving licence required · Security deposit depends on the vehicle.</div>
        </div>
      </form>
    </div>
  );
}

function Choice({active,onClick,title,text}) { return <button type="button" onClick={onClick} style={{textAlign:"left",padding:14,borderRadius:14,border:`1px solid ${active?C.blue:C.border}`,background:active?C.sky:C.white,cursor:"pointer"}}><strong style={{display:"block",color:C.navy}}>{title}</strong><span style={{fontSize:12,color:C.gray}}>{text}</span></button>; }
function Field({label,children}) { return <div><div style={labelStyle}>{label}</div>{children}</div>; }

function CustomerView({ cars, cities, bookings, leads, onBook }) {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("All");
  const [bookingCar, setBookingCar] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profile, setProfile] = useState(() => loadShared("sawariya_customer_profile", null));
  const [loginName, setLoginName] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [section, setSection] = useState("home");

  const activeCities = cities.filter(c => c.active);
  const filteredCars = useMemo(() => cars.filter(car => {
    const cityMatch = selectedCity === "All" || car.city === selectedCity;
    const q = search.trim().toLowerCase();
    return cityMatch && (!q || `${car.name} ${car.type} ${car.city}`.toLowerCase().includes(q));
  }), [cars, selectedCity, search]);
  const travelPackages = loadShared("sawariya_travel_packages", defaultTravelPackages);
  const decorations = loadShared("sawariya_decorations", defaultDecorations);

  function doLogin(e) {
    e.preventDefault();
    if (!loginName.trim() || !/^\d{10}$/.test(loginPhone.replace(/\D/g,""))) return alert("Enter your name and valid 10-digit mobile number.");
    const p={name:loginName.trim(),phone:loginPhone.replace(/\D/g,"")};
    saveShared("sawariya_customer_profile",p); setProfile(p); setLoginOpen(false); setLoginName(""); setLoginPhone("");
  }

  return <div style={{minHeight:"100vh",background:C.grayLight,color:C.navy}}>
    <header style={{position:"sticky",top:0,zIndex:50,background:"rgba(255,255,255,.96)",backdropFilter:"blur(14px)",borderBottom:`1px solid ${C.border}`}}>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <a href="#home" onClick={()=>setSection("home")} style={{textDecoration:"none",color:C.navy,fontWeight:1000,fontSize:19}}>SAWARIYA <span style={{color:C.blue}}>RENTALS</span></a>
        <nav style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
          <a href="#cars" style={navLink}>Cars</a><a href="#plans" style={navLink}>Plans</a><a href="#travel" style={navLink}>Travel</a><a href="#decor" style={navLink}>Decorated Cars</a>
          <button type="button" onClick={()=>setLoginOpen(true)} style={smallButton}>{profile ? `Hi, ${profile.name.split(" ")[0]}` : "Login"}</button>
        </nav>
      </div>
    </header>

    <main id="home">
      <section style={{background:"linear-gradient(135deg,#0f172a 0%,#1d4ed8 58%,#0ea5e9 100%)",color:C.white,padding:"58px 16px 42px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <Badge color="#93c5fd">🚗 Indore · Bhopal · Outstation</Badge>
          <h1 style={{fontSize:"clamp(38px,7vw,68px)",lineHeight:1.02,margin:"16px 0 12px",fontWeight:1000}}>Rent a Car.<br/><span style={{color:"#bfdbfe"}}>Travel Your Way.</span></h1>
          <p style={{maxWidth:680,fontSize:17,lineHeight:1.6,color:"#dbeafe",marginBottom:24}}>Self-drive cars, one-way trips, driver services, travel packages and special-event cars from Sawariya Rentals.</p>
          <div style={{background:C.white,color:C.navy,borderRadius:24,padding:18,boxShadow:"0 20px 60px rgba(0,0,0,.22)"}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}><strong style={{fontSize:16}}>Find your car</strong><Badge color={C.green}>18+ rental</Badge></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
              <select value={selectedCity} onChange={e=>setSelectedCity(e.target.value)} style={inputStyle}><option>All</option>{activeCities.map(c=><option key={c.id}>{c.name}</option>)}<option>Indore</option><option>Bhopal</option></select>
              <input placeholder="Search car" value={search} onChange={e=>setSearch(e.target.value)} style={inputStyle}/>
              <a href="#cars" style={{...primaryButton,textDecoration:"none"}}>Search Cars</a>
            </div>
          </div>
        </div>
      </section>

      <section id="plans" style={sectionStyle}><SectionTitle title="Rental plans" text="Automatic pricing starts from these rates. Exact price depends on the vehicle."/><div style={cardGrid}>
        <Plan title="Hourly" price="₹83/hr" text="20 km included · ₹6/km after included distance"/>
        <Plan title="Daily" price="₹2,200/day" text="280 km included · ₹6/km after included distance"/>
        <Plan title="Weekly" price="₹8,500/week" text="Starting-car rate · vehicle-specific pricing"/>
        <Plan title="Monthly" price="₹40,000/month" text="Starting rate · vehicle-specific pricing"/>
        <Plan title="Long Term" price="From ₹18,000/month" text="24-month commitment · vehicle-specific offer" featured/>
      </div></section>

      <section id="cars" style={sectionStyle}><SectionTitle title="Popular cars" text="Choose a car and customize the trip, fuel and driver option."/><div style={cardGrid}>{filteredCars.length ? filteredCars.map(car=><CarCard key={car.id} car={car} onBook={c=>setBookingCar(c)}/>) : <div style={emptyCard}>No cars found. Add your vehicles from Admin.</div>}</div></section>

      <section id="travel" style={{...sectionStyle,background:C.white}}><SectionTitle title="Explore Madhya Pradesh" text="Book a travel package with self-drive, driver or driver + guide."/><div style={cardGrid}>{travelPackages.map((p,i)=><TravelCard key={p.id||i} packageData={p}/>)}</div></section>

      <section id="decor" style={sectionStyle}><SectionTitle title="Decorated cars for special days" text="Birthday, wedding, anniversary, proposal and custom decoration."/><div style={cardGrid}>{decorations.map((d,i)=><DecorationCard key={d.id||i} item={d}/>)}</div></section>

      <section style={{...sectionStyle,background:C.white}}><SectionTitle title="Why Sawariya Rentals?"/><div style={cardGrid}><Feature title="One-way trips" text="Go to Bhopal, Indore or another supported destination without bringing the car back immediately."/><Feature title="Self drive or driver" text="Choose how you want to travel."/><Feature title="Doorstep delivery" text="Delivery is available for an additional charge."/><Feature title="18+ rentals" text="Minimum age 18 with a valid driving licence."/><Feature title="Outstation travel" text="Take your rental outside the city subject to vehicle and booking rules."/><Feature title="Transparent calculation" text="Distance, fuel, driver and return/recovery components are calculated automatically."/></div></section>

      <section style={sectionStyle}><SectionTitle title="How pricing works" text="Your final price is calculated from vehicle settings, distance and selected services."/><div style={{...summaryBox,maxWidth:900,margin:"0 auto"}}><div style={summaryRow}><span>Base rental</span><strong>Vehicle-specific</strong></div><div style={summaryRow}><span>Extra distance</span><strong>₹6/km default</strong></div><div style={summaryRow}><span>Fuel</span><strong>Customer option</strong></div><div style={summaryRow}><span>Driver</span><strong>Calculated from configured driver cost</strong></div><div style={summaryRow}><span>One-way recovery</span><strong>Distance + return fuel/time when applicable</strong></div><div style={summaryRow}><span>Business margin</span><strong>10%</strong></div></div></section>

      <footer style={{background:C.navy,color:C.white,padding:"34px 16px"}}><div style={{maxWidth:1100,margin:"0 auto",display:"grid",gap:8}}><strong style={{fontSize:20}}>SAWARIYA RENTALS</strong><span style={{color:"#cbd5e1"}}>Indore · Bhopal · Outstation</span><span style={{color:"#cbd5e1"}}>Minimum rental age: 18 years · Valid driving licence required.</span><div style={{marginTop:8}}><a href="tel:+917415228011" style={footerLink}>74152 28011</a> · <a href="tel:+918982802145" style={footerLink}>89828 02145</a> · <a href="https://wa.me/917415228011" target="_blank" rel="noreferrer" style={footerLink}>WhatsApp</a></div></div></footer>
    </main>

    {bookingCar && <BookingModal car={bookingCar} onClose={()=>setBookingCar(null)} onConfirm={onBook}/>} 
    {loginOpen && <div style={modalOverlay}><form onSubmit={doLogin} style={{...modalCard,maxWidth:430}}><div style={modalHeader}><div><div style={{fontSize:12,color:C.blue,fontWeight:900}}>CUSTOMER LOGIN</div><h2 style={{margin:"4px 0 0"}}>Welcome to Sawariya</h2></div><button type="button" onClick={()=>setLoginOpen(false)} style={iconButton}><X size={20}/></button></div><div style={{padding:20,display:"grid",gap:14}}><Field label="Name"><input value={loginName} onChange={e=>setLoginName(e.target.value)} style={inputStyle}/></Field><Field label="Mobile number"><input value={loginPhone} onChange={e=>setLoginPhone(e.target.value)} inputMode="numeric" style={inputStyle}/></Field><button style={primaryButton}>Continue</button><p style={{fontSize:12,color:C.gray,margin:0}}>This quick login saves your booking profile on this device. A secure OTP account can be added later with Supabase Auth.</p></div></form></div>}
  </div>;
}

function Plan({title,price,text,featured}) { return <div style={{...whiteCard,border:featured?`2px solid ${C.blue}`:`1px solid ${C.border}`}}><Badge color={featured?C.blue:C.gray}>{featured?"BEST LONG TERM":"PLAN"}</Badge><h3 style={{margin:"12px 0 4px"}}>{title}</h3><div style={{fontSize:24,fontWeight:1000,color:C.blue}}>{price}</div><p style={{color:C.gray,fontSize:13,lineHeight:1.5}}>{text}</p></div>; }
function SectionTitle({title,text}) { return <div style={{maxWidth:800,margin:"0 auto 22px"}}><h2 style={{fontSize:"clamp(26px,5vw,38px)",margin:0,fontWeight:1000}}>{title}</h2>{text&&<p style={{color:C.gray,margin:"7px 0 0",lineHeight:1.5}}>{text}</p>}</div>; }
function Feature({title,text}) { return <div style={whiteCard}><ShieldCheck size={24} color={C.blue}/><h3 style={{margin:"10px 0 5px"}}>{title}</h3><p style={{margin:0,color:C.gray,fontSize:13,lineHeight:1.5}}>{text}</p></div>; }
function TravelCard({packageData}) { const [open,setOpen]=useState(false); return <div style={whiteCard}><div style={{height:150,borderRadius:14,background:"linear-gradient(135deg,#dbeafe,#fef3c7)",display:"flex",alignItems:"flex-end",padding:14,boxSizing:"border-box"}}><Badge color={C.blue}>{packageData.days || "Custom"} days</Badge></div><h3 style={{margin:"14px 0 5px"}}>{packageData.name}</h3><p style={{color:C.gray,fontSize:13,minHeight:38}}>{packageData.description}</p><div style={{display:"flex",gap:7,flexWrap:"wrap"}}><Badge color={C.green}>Self drive</Badge><Badge color={C.orange}>Driver</Badge><Badge color={C.blue}>Guide</Badge></div><button type="button" onClick={()=>setOpen(!open)} style={{...secondaryButton,width:"100%",marginTop:14}}>{open?"Hide options":"View package"}</button>{open&&<div style={{marginTop:12,padding:12,background:C.grayLight,borderRadius:12,fontSize:13}}><div>Self drive: {fmtINR(packageData.selfDrivePrice || packageData.price || 0)}</div><div>With driver: {fmtINR(packageData.driverPrice || 0)}</div><div>Driver + guide: {fmtINR(packageData.guidePrice || 0)}</div><div style={{marginTop:8,color:C.gray}}>Final route and service price is confirmed at booking.</div></div>}</div>; }
function DecorationCard({item}) { return <div style={whiteCard}><div style={{height:150,borderRadius:14,background:"linear-gradient(135deg,#fce7f3,#fef3c7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:42}}>🎉</div><h3 style={{margin:"14px 0 5px"}}>{item.name}</h3><p style={{color:C.gray,fontSize:13}}>{item.description}</p><div style={{fontWeight:900,color:C.blue}}>{item.price ? `From ${fmtINR(item.price)}` : "Custom price"}</div><button type="button" onClick={()=>alert("Decoration request can be confirmed by Sawariya after you share the occasion and custom requirements.")} style={{...secondaryButton,width:"100%",marginTop:12}}>Customize</button></div>; }

function AdminView({
  cars,
  setCars,
  cities,
  setCities,
  bookings,
  leads,
}) {
  const [tab, setTab] =
    useState("dashboard");

    const [leadList, setLeadList] = useState(leads || []);

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

  const totalCars =
    cars.length;

  const availableCars =
    cars.filter(
      (car) =>
        car.available
    ).length;

  const rentedCars =
    cars.filter(
      (car) =>
        !car.available
    ).length;

  const totalRevenue =
    bookings.reduce(
      (sum, booking) =>
        sum +
        Number(
          booking.paidAmount ??
            booking.total ??
            0
        ),
      0
    );

  const totalPending =
    bookings.reduce(
      (sum, booking) =>
        sum +
        Number(
          booking.remainingAmount ??
            0
        ),
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
      </main>
    </div>
  );
}


function VehiclePricingEditor({car,onSaved}){
  const [form,setForm]=useState({
    hourlyRate:car.hourlyRate ?? "", dailyRate:car.dailyRate ?? car.price24 ?? "", weeklyRate:car.weeklyRate ?? "", monthlyRate:car.monthlyRate ?? "", longTermRate:car.longTermRate ?? "", hourlyKm:car.hourlyKm ?? 20, dailyKm:car.dailyKm ?? 280, extraKmRate:car.extraKmRate ?? 6, driverCost:car.driverCost ?? 1000, fuelCostPerKm:car.fuelCostPerKm ?? "", securityDeposit:car.securityDeposit ?? ""
  });
  async function save(){ const updated={...car,...form}; for(const k of ["hourlyRate","dailyRate","weeklyRate","monthlyRate","longTermRate","hourlyKm","dailyKm","extraKmRate","driverCost","fuelCostPerKm","securityDeposit"]){ if(form[k]!=="") updated[k]=Number(form[k]); } try{await upsertCar(updated);onSaved(updated);alert(`${car.name} pricing saved.`);}catch(e){alert(e?.message||"Could not save vehicle pricing.");} }
  const f=(key,label)=><Field label={label}><input type="number" value={form[key]} onChange={e=>setForm(x=>({...x,[key]:e.target.value}))} style={inputStyle}/></Field>;
  return <div style={{padding:14,border:`1px solid ${C.border}`,borderRadius:16,marginBottom:12}}><strong>{car.name}</strong><div style={{fontSize:12,color:C.gray,marginBottom:10}}>{car.city} · {car.fuel}</div><div style={fieldGrid}>{f("hourlyRate","Hourly ₹/hr")} {f("dailyRate","Daily ₹")} {f("weeklyRate","Weekly ₹")} {f("monthlyRate","Monthly ₹")} {f("longTermRate","24-month ₹/month")} {f("hourlyKm","Hourly included KM")} {f("dailyKm","Daily included KM")} {f("extraKmRate","Extra ₹/km")} {f("driverCost","Driver cost/day")} {f("fuelCostPerKm","Fuel cost/km")} {f("securityDeposit","Security deposit (admin only)")}</div><button type="button" onClick={save} style={{...primaryButton,marginTop:12}}>Save {car.name}</button></div>;
}

function BusinessControls({cars,setCars}){
  const [settings,setSettings]=useState(()=>loadShared("sawariya_business_settings",defaultBusinessSettings));
  const [packages,setPackages]=useState(()=>loadShared("sawariya_travel_packages",defaultTravelPackages));
  const [decorations,setDecorations]=useState(()=>loadShared("sawariya_decorations",defaultDecorations));
  const [tab,setTab]=useState("pricing");
  function saveSettings(){saveShared("sawariya_business_settings",settings);alert("Pricing settings saved.");}
  function updatePackage(i,k,v){setPackages(p=>p.map((x,n)=>n===i?{...x,[k]:v}:x));}
  function updateDecoration(i,k,v){setDecorations(p=>p.map((x,n)=>n===i?{...x,[k]:v}:x));}
  function saveContent(){saveShared("sawariya_travel_packages",packages);saveShared("sawariya_decorations",decorations);alert("Travel and decoration settings saved.");}
  const num=(key)=> <input type="number" value={settings[key]} onChange={e=>setSettings(s=>({...s,[key]:Number(e.target.value)}))} style={inputStyle}/>;
  return <section style={{maxWidth:1200,margin:"0 auto",padding:"24px 16px 60px",background:C.grayLight}}><div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:22,padding:18}}><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>{[["pricing","Pricing"],["vehicles","Vehicle Pricing"],["travel","Travel Packages"],["decor","Decorations"]].map(([id,label])=><button key={id} type="button" onClick={()=>setTab(id)} style={tab===id?primaryButton:secondaryButton}>{label}</button>)}</div>{tab==="vehicles"&&<><h2>Vehicle-specific pricing</h2><p style={{color:C.gray}}>These settings override the default business pricing for a particular car. Security deposit is not shown to customers.</p>{cars.map((car,index)=><VehiclePricingEditor key={car.id||index} car={car} onSaved={(updated)=>setCars(prev=>prev.map(x=>x.id===updated.id?updated:x))}/>)}</>}
{tab==="pricing"&&<><h2>Automatic pricing controls</h2><p style={{color:C.gray}}>Default settings. Individual vehicles can override these fields when you add them.</p><div style={fieldGrid}>{Object.entries({hourlyStartingPrice:"Hourly starting price",hourlyIncludedKm:"Hourly included KM",dailyStartingPrice:"Daily starting price",dailyIncludedKm:"Daily included KM",weeklyStartingPrice:"Weekly starting price",monthlyStartingPrice:"Monthly starting price",longTermMonthlyPrice:"Long-term monthly price",longTermMonths:"Long-term commitment months",extraKmRate:"Extra KM rate",driverCostPerDay:"Driver cost/day",cngCostPerKm:"CNG cost/km",dieselCostPerKm:"Diesel cost/km",petrolCostPerKm:"Petrol cost/km",guideCostPerDay:"Guide cost/day",returnTimeCostPerHour:"Return time cost/hour",deliveryFlatCharge:"Delivery charge",marginPercent:"Margin %",bookingAdvance:"Booking advance"}).map(([k,l])=><Field key={k} label={l}>{num(k)}</Field>)}</div><button onClick={saveSettings} style={{...primaryButton,marginTop:16}}>Save pricing</button></>}{tab==="travel"&&<><h2>Travel packages</h2>{packages.map((p,i)=><div key={p.id} style={{padding:14,border:`1px solid ${C.border}`,borderRadius:14,marginBottom:10}}><div style={fieldGrid}><Field label="Name"><input value={p.name} onChange={e=>updatePackage(i,"name",e.target.value)} style={inputStyle}/></Field><Field label="Days"><input type="number" value={p.days} onChange={e=>updatePackage(i,"days",Number(e.target.value))} style={inputStyle}/></Field><Field label="Self-drive price"><input type="number" value={p.selfDrivePrice} onChange={e=>updatePackage(i,"selfDrivePrice",Number(e.target.value))} style={inputStyle}/></Field><Field label="Driver price"><input type="number" value={p.driverPrice} onChange={e=>updatePackage(i,"driverPrice",Number(e.target.value))} style={inputStyle}/></Field><Field label="Driver + guide"><input type="number" value={p.guidePrice} onChange={e=>updatePackage(i,"guidePrice",Number(e.target.value))} style={inputStyle}/></Field></div><Field label="Description"><input value={p.description} onChange={e=>updatePackage(i,"description",e.target.value)} style={inputStyle}/></Field></div>)}<button onClick={saveContent} style={primaryButton}>Save travel packages</button></>}{tab==="decor"&&<><h2>Decorated car options</h2>{decorations.map((d,i)=><div key={d.id} style={{padding:14,border:`1px solid ${C.border}`,borderRadius:14,marginBottom:10}}><div style={fieldGrid}><Field label="Name"><input value={d.name} onChange={e=>updateDecoration(i,"name",e.target.value)} style={inputStyle}/></Field><Field label="Price"><input type="number" value={d.price} onChange={e=>updateDecoration(i,"price",Number(e.target.value))} style={inputStyle}/></Field></div><Field label="Description"><input value={d.description} onChange={e=>updateDecoration(i,"description",e.target.value)} style={inputStyle}/></Field></div>)}<button onClick={saveContent} style={primaryButton}>Save decorations</button></>}</div></section>;
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
  leads,
}) {
  const [passcode, setPasscode] =
    useState("");

  const [loggedIn, setLoggedIn] =
    useState(false);

  function login(e) {
    e.preventDefault();

    if (!ADMIN_PASSCODE) {
      alert("Admin login is not configured. Add VITE_ADMIN_PASSCODE in Vercel environment variables.");
      return;
    }

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
      <AdminView
        cars={
          cars
        }
        setCars={
          setCars
        }
        cities={
          cities
        }
        setCities={
          setCities
        }
        bookings={
          bookings
        }
        leads={
          leads
        }
      />
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
        if (ci.length) setCities(ci);
        if (b.length) setBookings(b);
        setLeads(l || []);
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
      <div>
        <div
          style={{
            position:
              "fixed",
            right: 14,
            bottom: 14,
            zIndex: 2000,
          }}
        >
          <button
            type="button"
            onClick={() =>
              setIsAdmin(
                false
              )
            }
            style={{
              ...secondaryButton,
              boxShadow:
                "0 10px 30px rgba(0,0,0,.15)",
            }}
          >
            <X
              size={
                16
              }
            />
            Exit Admin
          </button>
        </div>

        <AdminGate
          cars={
            cars
          }
          setCars={
            setCars
          }
          cities={
            cities
          }
          setCities={
            setCities
          }
          bookings={
            bookings
          }
        />
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


const navLink={textDecoration:"none",color:C.navy,fontSize:13,fontWeight:850,padding:"8px 7px"};
const footerLink={color:"#bfdbfe",textDecoration:"none"};
const sectionStyle={padding:"52px 16px"};
const cardGrid={maxWidth:1200,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16};
const whiteCard={background:C.white,border:`1px solid ${C.border}`,borderRadius:20,padding:18,boxShadow:"0 8px 28px rgba(15,23,42,.05)"};
const emptyCard={...whiteCard,gridColumn:"1/-1",textAlign:"center",color:C.gray};
const modalOverlay={position:"fixed",inset:0,zIndex:1000,background:"rgba(2,6,23,.7)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:16,overflowY:"auto",boxSizing:"border-box"};
const modalCard={width:"100%",maxWidth:760,background:C.white,borderRadius:24,overflow:"hidden",boxShadow:"0 30px 90px rgba(0,0,0,.28)",margin:"10px auto"};
const modalHeader={padding:"18px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"};
const iconButton={width:40,height:40,borderRadius:999,border:`1px solid ${C.border}`,background:C.white,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"};
const choiceGrid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8};
const fieldGrid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12};
const infoBox={padding:13,borderRadius:14,background:C.sky,border:`1px solid #bfdbfe`,display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"};
const summaryBox={padding:14,borderRadius:16,background:C.grayLight,border:`1px solid ${C.border}`};
const summaryRow={display:"flex",justifyContent:"space-between",gap:10,padding:"5px 0",fontSize:13};

/* =========================================================
   EXPORT
========================================================= */

export default App;
