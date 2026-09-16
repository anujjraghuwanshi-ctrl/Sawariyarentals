import React, { useEffect, useState } from "react";
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
} from "./supabase";

const C = {
  navy: "#0f172a",
  blue: "#2563eb",
  green: "#16a34a",
  greenLight: "#f0fdf4",
  red: "#dc2626",
  redLight: "#fef2f2",
  orange: "#ea580c",
  orangeLight: "#fff7ed",
  gray: "#64748b",
  grayLight: "#f8fafc",
  sky: "#eff6ff",
  border: "#e2e8f0",
  white: "#ffffff",
};

const ADMIN_PASSCODE = "1234";
const BOOKING_ADVANCE = 500;
const RENTAL_DURATIONS = [8, 12, 24];

function fmtINR(v) {
  return `₹${Number(v || 0).toLocaleString("en-IN")}`;
}

function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function priceFor(car, hours) {
  if (hours === 8) return Number(car.price8 || 0);
  if (hours === 12) return Number(car.price12 || 0);
  return Number(car.price24 || 0);
}

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 1200;
        let w = img.width;
        let h = img.height;
        if (w > max) {
          h = Math.round((h * max) / w);
          w = max;
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: C.navy,
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 7,
};

const inputStyle = {
  width: "100%",
  height: 46,
  boxSizing: "border-box",
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: "0 13px",
  background: C.white,
  color: C.navy,
  fontSize: 14,
  outline: "none",
};

const primaryButton = {
  minHeight: 44,
  border: "none",
  borderRadius: 12,
  padding: "10px 15px",
  background: C.blue,
  color: C.white,
  fontSize: 14,
  fontWeight: 900,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  cursor: "pointer",
};

const secondaryButton = {
  ...primaryButton,
  background: C.white,
  color: C.navy,
  border: `1px solid ${C.border}`,
};

const dangerButton = {
  ...secondaryButton,
  background: C.redLight,
  color: C.red,
  border: "1px solid #fecaca",
  minHeight: 38,
  fontSize: 12,
};

function Badge({ children, color = C.blue }) {
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
      }}
    >
      {children}
    </span>
  );
}

function PriceBox({ label, value, bg, color }) {
  return (
    <div style={{ padding: 10, borderRadius: 12, background: bg }}>
      <div style={{ color: C.gray, fontSize: 11, fontWeight: 700 }}>{label}</div>
      <strong style={{ color, fontSize: 16 }}>{fmtINR(value)}</strong>
    </div>
  );
}

function navBtn(side) {
  return {
    position: "absolute",
    [side]: 10,
    top: "50%",
    transform: "translateY(-50%)",
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "none",
    background: "rgba(255,255,255,.9)",
    cursor: "pointer",
  };
}

function CarCard({ car, onBook }) {
  const [i, setI] = useState(0);
  const photos = car.photos || [];
  const photo = photos[i % Math.max(photos.length, 1)];

  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 22,
        overflow: "hidden",
        boxShadow: "0 8px 30px rgba(15,23,42,.06)",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "16/10", background: C.sky }}>
        {photo ? (
          <img src={photo} alt={car.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Car size={72} color={C.blue} />
          </div>
        )}
        <div style={{ position: "absolute", top: 12, left: 12 }}>
          {car.available !== false ? (
            <Badge color={C.green}><CheckCircle2 size={13} /> Available</Badge>
          ) : (
            <Badge color={C.red}><Clock3 size={13} /> Rented</Badge>
          )}
        </div>
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => setI((n) => (n - 1 + photos.length) % photos.length)} style={navBtn("left")}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={() => setI((n) => (n + 1) % photos.length)} style={navBtn("right")}>
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>
      <div style={{ padding: 18 }}>
        <h3 style={{ margin: 0, color: C.navy, fontSize: 19 }}>{car.name}</h3>
        <div style={{ color: C.gray, fontSize: 13, marginTop: 4 }}>{car.type} • {car.city}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
          <PriceBox label="8 HOURS" value={car.price8} bg={C.sky} color={C.blue} />
          <PriceBox label="12 HOURS" value={car.price12} bg={C.greenLight} color={C.green} />
          <PriceBox label="24 HOURS" value={car.price24} bg={C.orangeLight} color={C.orange} />
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>
          <Badge color={C.gray}><User size={12} /> {car.seats} Seats</Badge>
          <Badge color={C.gray}>{car.fuel}</Badge>
          <Badge color={C.gray}>{car.transmission}</Badge>
        </div>
        <button
          type="button"
          disabled={car.available === false}
          onClick={() => onBook(car)}
          style={{ ...primaryButton, width: "100%", marginTop: 16, opacity: car.available === false ? 0.5 : 1 }}
        >
          {car.available === false ? "Currently Rented" : "Book This Car"}
        </button>
      </div>
    </div>
  );
}

function BookingModal({ car, onClose, onConfirm }) {
  const [pickupDate, setPickupDate] = useState(todayISO());
  const [pickupTime, setPickupTime] = useState("09:00");
  const [hours, setHours] = useState(12);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentType, setPaymentType] = useState("advance");
  const [loading, setLoading] = useState(false);
  const total = priceFor(car, hours);
  const payNow = paymentType === "advance" ? Math.min(BOOKING_ADVANCE, total) : total;
  const remaining = Math.max(0, total - payNow);

  async function submit(e) {
    e.preventDefault();
    const clean = phone.replace(/\D/g, "");
    if (!name.trim() || !/^\d{10}$/.test(clean)) {
      alert("Enter name and a valid 10-digit mobile number.");
      return;
    }
    if (total <= 0) {
      alert("This car has no price for that duration.");
      return;
    }
    try {
      setLoading(true);
      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: payNow,
          carId: car.id,
          carName: car.name,
          name: name.trim(),
          phone: clean,
          rentalDuration: hours,
          pickupDate,
          pickupTime,
        }),
      });
      const orderData = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok) throw new Error(orderData.message || "Unable to create payment order.");
      const orderId = orderData.id || orderData.orderId;
      if (!
