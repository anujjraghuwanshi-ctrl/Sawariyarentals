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

const ADMIN_PASSCODE = "1234";
const BOOKING_ADVANCE = 500;

/* =========================================================
   INITIAL DATA
========================================================= */

const seedCars = [
  {
    id: "car-1",
    name: "Maruti Swift",
    type: "Hatchback",
    seats: 5,
    fuel: "Petrol",
    transmission: "Manual",
    price: 1499,
    city: "Bhopal",
    photos: [],
    available: true,
  },
  {
    id: "car-2",
    name: "Hyundai i20",
    type: "Hatchback",
    seats: 5,
    fuel: "Petrol",
    transmission: "Manual",
    price: 1699,
    city: "Bhopal",
    photos: [],
    available: true,
  },
  {
    id: "car-3",
    name: "Hyundai Aura",
    type: "Sedan",
    seats: 5,
    fuel: "Petrol",
    transmission: "Manual",
    price: 1799,
    city: "Bhopal",
    photos: [],
    available: true,
  },
  {
    id: "car-4",
    name: "Maruti Ertiga",
    type: "MUV",
    seats: 7,
    fuel: "Petrol",
    transmission: "Manual",
    price: 2299,
    city: "Bhopal",
    photos: [],
    available: true,
  },
];

const seedCities = [
  {
    id: "city-1",
    name: "Bhopal",
    active: true,
  },
];

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

function addDaysISO(dateString, days) {
  const d = new Date(`${dateString}T00:00:00`);
  d.setDate(d.getDate() + Number(days || 0));

  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);

  return local.toISOString().slice(0, 10);
}

function daysBetween(start, end) {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);

  const diff = Math.ceil((b - a) / 86400000);

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
   IMAGE COMPRESSION
========================================================= */

function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
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
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function CarThumb({ car, size = 150 }) {
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
        <Car size={48} color={C.blue} strokeWidth={1.5} />
      )}
    </div>
  );
}

/* =========================================================
   CAR CARD
========================================================= */

function CarCard({ car, onBook }) {
  const [photoIndex, setPhotoIndex] = useState(0);

  const photos = car.photos || [];

  const currentPhoto =
    photos.length > 0
      ? photos[photoIndex % photos.length]
      : null;

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

        {car.available ? (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
            }}
          >
            <Badge color={C.green}>
              <CheckCircle2 size={13} />
              Available
            </Badge>
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
            }}
          >
            <Badge color={C.red}>
              <Clock3 size={13} />
              Rented
            </Badge>
          </div>
        )}

        {photos.length > 1 && (
          <>
            <button
              onClick={() =>
                setPhotoIndex(
                  (photoIndex - 1 + photos.length) %
                    photos.length
                )
              }
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 34,
                height: 34,
                borderRadius: 999,
                border: "none",
                background: "rgba(255,255,255,.9)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={() =>
                setPhotoIndex(
                  (photoIndex + 1) % photos.length
                )
              }
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 34,
                height: 34,
                borderRadius: 999,
                border: "none",
                background: "rgba(255,255,255,.9)",
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
            justifyContent: "space-between",
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

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                color: C.blue,
                fontWeight: 900,
                fontSize: 19,
              }}
            >
              {fmtINR(car.price)}
            </div>

            <div
              style={{
                color: C.gray,
                fontSize: 12,
              }}
            >
              per day
            </div>
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

          <Badge color={C.gray}>{car.fuel}</Badge>

          <Badge color={C.gray}>
            {car.transmission}
          </Badge>
        </div>

        <button
          onClick={() => onBook(car)}
          disabled={!car.available}
          style={{
            ...primaryButton,
            width: "100%",
            marginTop: 18,
            opacity: car.available ? 1 : 0.5,
            cursor: car.available ? "pointer" : "not-allowed",
          }}
        >
          {car.available ? "Book This Car" : "Currently Rented"}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   BOOKING MODAL
========================================================= */

function BookingModal({ car, onClose, onConfirm }) {
  const minDate = todayISO();

  const [pickupDate, setPickupDate] = useState(minDate);
  const [returnDate, setReturnDate] = useState(
    addDaysISO(minDate, 1)
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentType, setPaymentType] = useState("advance");

  const [loading, setLoading] = useState(false);

  const days = daysBetween(pickupDate, returnDate);

  const total = days * Number(car.price || 0);

  const advanceAmount = Math.min(
    BOOKING_ADVANCE,
    total
  );

  const paymentAmount =
    paymentType === "advance"
      ? advanceAmount
      : total;

  const remainingAmount = Math.max(
    0,
    total - paymentAmount
  );

  function handlePickupChange(value) {
    setPickupDate(value);

    if (returnDate <= value) {
      setReturnDate(addDaysISO(value, 1));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const cleanPhone = phone.replace(/\D/g, "");

    if (!name.trim()) {
      alert("Please enter your name.");
      return;
    }

    if (!/^\d{10}$/.test(cleanPhone)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!pickupDate || !returnDate) {
      alert("Please select pickup and return dates.");
      return;
    }

    if (returnDate <= pickupDate) {
      alert("Return date must be after pickup date.");
      return;
    }

    try {
      setLoading(true);

      /* -----------------------------------------------
         CREATE RAZORPAY ORDER
         Backend expects amount in RUPEES.
      ------------------------------------------------ */

      const orderResponse = await fetch(
        "/api/create-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: paymentAmount,
            carId: car.id,
            carName: car.name,
            name: name.trim(),
            phone: cleanPhone,
          }),
        }
      );

      if (!orderResponse.ok) {
        throw new Error(
          "Unable to create payment order."
        );
      }

      const orderData = await orderResponse.json();

      if (!orderData?.id) {
        throw new Error(
          "Payment order was not created."
        );
      }

      if (!window.Razorpay) {
        alert(
          "Razorpay is not loaded. Please refresh the page and try again."
        );
        return;
      }

      const options = {
        key:
          orderData.key ||
          import.meta.env.VITE_RAZORPAY_KEY_ID,

        amount:
          orderData.amount ||
          Math.round(paymentAmount * 100),

        currency:
          orderData.currency || "INR",

        name: "SAWARIYA RENTALS",

        description:
          paymentType === "advance"
            ? `₹${advanceAmount} Booking Advance - ${car.name}`
            : `Full Payment - ${car.name}`,

        order_id: orderData.id,

        prefill: {
          name: name.trim(),
          contact: cleanPhone,
        },

        theme: {
          color: C.blue,
        },

        handler: async function (response) {
          try {
            const verifyResponse = await fetch(
              "/api/verify-payment",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  razorpay_order_id:
                    response.razorpay_order_id,

                  razorpay_payment_id:
                    response.razorpay_payment_id,

                  razorpay_signature:
                    response.razorpay_signature,

                  amount: paymentAmount,
                }),
              }
            );

            if (!verifyResponse.ok) {
              throw new Error(
                "Payment verification failed."
              );
            }

            const verifyData =
              await verifyResponse.json();

            if (
              verifyData?.success === false ||
              verifyData?.verified === false
            ) {
              throw new Error(
                "Payment could not be verified."
              );
            }

            onConfirm({
              carId: car.id,
              carName: car.name,
              city: car.city,
              name: name.trim(),
              phone: cleanPhone,
              pickupDate,
              returnDate,
              days,
              total,
              paidAmount: paymentAmount,
              advancePaid:
                paymentType === "advance"
                  ? paymentAmount
                  : 0,
              remainingAmount,
              paymentType,
              paymentId:
                response.razorpay_payment_id,
              orderId:
                response.razorpay_order_id,
              signature:
                response.razorpay_signature,
              status: "Confirmed",
            });

            alert(
              paymentType === "advance"
                ? `Booking confirmed!\n\n₹${paymentAmount.toLocaleString(
                    "en-IN"
                  )} advance paid.\nRemaining ${fmtINR(
                    remainingAmount
                  )} payable later.`
                : `Booking confirmed!\n\nFull payment of ${fmtINR(
                    total
                  )} received.`
            );

            onClose();
          } catch (error) {
            console.error(error);

            alert(
              error?.message ||
                "Payment verification failed. Please contact support."
            );
          }
        },

        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on(
        "payment.failed",
        function (response) {
          console.error(
            "Payment failed:",
            response
          );

          alert(
            response?.error?.description ||
              "Payment failed. Please try again."
          );

          setLoading(false);
        }
      );

      razorpay.open();
    } catch (error) {
      console.error(error);

      alert(
        error?.message ||
          "Something went wrong while starting payment."
      );

      setLoading(false);
    }
  }

  return (
    <div
      id="kaxq0y"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15,23,42,.65)",
        display: "flex",

        /*
          IMPORTANT:
          Do NOT vertically center the modal.

          On mobile, a tall modal could otherwise have its
          top hidden outside the viewport. This was the reason
          the Name and Phone fields disappeared until zoom-out.
        */
        alignItems: "flex-start",

        justifyContent: "center",

        padding: "16px",

        overflowY: "auto",

        WebkitOverflowScrolling: "touch",

        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,

          boxSizing: "border-box",

          background: C.white,

          borderRadius: 24,

          boxShadow:
            "0 30px 80px rgba(0,0,0,.25)",

          overflow: "hidden",

          margin: "0 auto 16px",

          flexShrink: 0,
        }}
      >
        {/* HEADER */}

        <div
          style={{
            padding: "18px 20px",

            background:
              "linear-gradient(135deg,#eff6ff,#ffffff)",

            borderBottom:
              `1px solid ${C.border}`,

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

            gap: 12,
          }}
        >
          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: C.blue,
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Book Your Car
            </div>

            <h2
              style={{
                margin: "4px 0 0",
                color: C.navy,
                fontSize: 22,
                fontWeight: 900,
                lineHeight: 1.2,
                wordBreak: "break-word",
              }}
            >
              {car.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 999,
              border: `1px solid ${C.border}`,
              background: C.white,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}

        <div
          id="g4c2yw"
          style={{
            padding: 20,
            boxSizing: "border-box",
            width: "100%",
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* CUSTOMER DETAILS */}

            <h3
              style={{
                margin: "0 0 12px",
                color: C.navy,
                fontSize: 16,
                fontWeight: 900,
              }}
            >
              Customer Details
            </h3>

            <div
              id="rdvxzt"
              style={{
                display: "grid",

                /*
                  IMPORTANT:
                  min(200px, 100%) prevents the input columns
                  from becoming wider than a small phone.
                */
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",

                gap: 14,

                width: "100%",

                boxSizing: "border-box",
              }}
            >
              <div>
                <label style={labelStyle}>
                  <User size={14} />
                  Full Name
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Enter your name"
                  style={inputStyle}
                  autoComplete="name"
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>
                  <Phone size={14} />
                  Mobile Number
                </label>

                <input
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10)
                    )
                  }
                  placeholder="10-digit mobile number"
                  style={inputStyle}
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            {/* DATE DETAILS */}

            <h3
              style={{
                margin: "22px 0 12px",
                color: C.navy,
                fontSize: 16,
                fontWeight: 900,
              }}
            >
              Rental Dates
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
                gap: 14,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div>
                <label style={labelStyle}>
                  <CalendarDays size={14} />
                  Pickup Date
                </label>

                <input
                  type="date"
                  min={minDate}
                  value={pickupDate}
                  onChange={(e) =>
                    handlePickupChange(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>
                  <CalendarDays size={14} />
                  Return Date
                </label>

                <input
                  type="date"
                  min={addDaysISO(pickupDate, 1)}
                  value={returnDate}
                  onChange={(e) =>
                    setReturnDate(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            {/* RENTAL SUMMARY */}

            <div
              style={{
                marginTop: 18,
                padding: 16,
                borderRadius: 18,
                background: C.grayLight,
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    color: C.gray,
                    fontSize: 14,
                  }}
                >
                  Daily Rate
                </span>

                <strong
                  style={{
                    color: C.navy,
                  }}
                >
                  {fmtINR(car.price)}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    color: C.gray,
                    fontSize: 14,
                  }}
                >
                  Rental Days
                </span>

                <strong
                  style={{
                    color: C.navy,
                  }}
                >
                  {days} day{days > 1 ? "s" : ""}
                </strong>
              </div>

              <div
                style={{
                  height: 1,
                  background: C.border,
                  margin: "10px 0",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <strong
                  style={{
                    color: C.navy,
                    fontSize: 16,
                  }}
                >
                  Total Rental Amount
                </strong>

                <strong
                  style={{
                    color: C.blue,
                    fontSize: 20,
                  }}
                >
                  {fmtINR(total)}
                </strong>
              </div>
            </div>

            {/* PAYMENT OPTIONS */}

            <h3
              style={{
                margin: "22px 0 12px",
                color: C.navy,
                fontSize: 16,
                fontWeight: 900,
              }}
            >
              Choose Payment
            </h3>

            <div
              id="xeyajc"
              style={{
                display: "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(230px, 100%), 1fr))",

                gap: 12,

                width: "100%",

                boxSizing: "border-box",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setPaymentType("advance")
                }
                disabled={total < BOOKING_ADVANCE}
                style={{
                  textAlign: "left",
                  padding: 16,
                  borderRadius: 18,

                  border:
                    paymentType === "advance"
                      ? `2px solid ${C.blue}`
                      : `1px solid ${C.border}`,

                  background:
                    paymentType === "advance"
                      ? C.sky
                      : C.white,

                  cursor:
                    total < BOOKING_ADVANCE
                      ? "not-allowed"
                      : "pointer",

                  opacity:
                    total < BOOKING_ADVANCE
                      ? 0.5
                      : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: C.white,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CreditCard
                      size={20}
                      color={C.blue}
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        color: C.navy,
                        fontWeight: 900,
                        fontSize: 15,
                      }}
                    >
                      ₹500 Booking Advance
                    </div>

                    <div
                      style={{
                        color: C.gray,
                        fontSize: 12,
                        marginTop: 3,
                      }}
                    >
                      Pay only ₹500 now
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setPaymentType("full")
                }
                style={{
                  textAlign: "left",
                  padding: 16,
                  borderRadius: 18,

                  border:
                    paymentType === "full"
                      ? `2px solid ${C.green}`
                      : `1px solid ${C.border}`,

                  background:
                    paymentType === "full"
                      ? C.greenLight
                      : C.white,

                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: C.white,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IndianRupee
                      size={20}
                      color={C.green}
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        color: C.navy,
                        fontWeight: 900,
                        fontSize: 15,
                      }}
                    >
                      Pay Full Amount
                    </div>

                    <div
                      style={{
                        color: C.gray,
                        fontSize: 12,
                        marginTop: 3,
                      }}
                    >
                      Pay {fmtINR(total)} now
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* PAYMENT SUMMARY */}

            <div
              style={{
                marginTop: 14,
                padding: 16,
                borderRadius: 18,

                background:
                  paymentType === "advance"
                    ? C.orangeLight
                    : C.greenLight,

                border:
                  paymentType === "advance"
                    ? `1px solid #fed7aa`
                    : `1px solid #bbf7d0`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 7,
                }}
              >
                <span
                  style={{
                    color: C.gray,
                    fontSize: 14,
                  }}
                >
                  Pay Now
                </span>

                <strong
                  style={{
                    color:
                      paymentType === "advance"
                        ? C.orange
                        : C.green,
                    fontSize: 18,
                  }}
                >
                  {fmtINR(paymentAmount)}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    color: C.gray,
                    fontSize: 14,
                  }}
                >
                  Remaining Payable Later
                </span>

                <strong
                  style={{
                    color: C.navy,
                    fontSize: 16,
                  }}
                >
                  {fmtINR(remainingAmount)}
                </strong>
              </div>

              {paymentType === "advance" && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: C.gray,
                  }}
                >
                  Only ₹500 will be charged now. The
                  remaining {fmtINR(remainingAmount)} will
                  be payable later.
                </div>
              )}
            </div>

            {/* BUTTONS */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(150px, 100%), 1fr))",
                gap: 10,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={secondaryButton}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...primaryButton,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading
                    ? "wait"
                    : "pointer",
                }}
              >
                <CreditCard size={18} />

                {loading
                  ? "Processing..."
                  : `Pay ${fmtINR(paymentAmount)}`}
              </button>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
                color: C.gray,
                fontSize: 12,
              }}
            >
              <ShieldCheck size={14} />

              Secure payment powered by Razorpay
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

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

  const [search, setSearch] = useState("");

  const [bookingCar, setBookingCar] =
    useState(null);

  const activeCities = cities.filter(
    (city) => city.active
  );

  const filteredCars = useMemo(() => {
    return cars.filter((car) => {
      const cityMatch =
        selectedCity === "All" ||
        car.city === selectedCity;

      const searchText = search
        .trim()
        .toLowerCase();

      const searchMatch =
        !searchText ||
        car.name
          .toLowerCase()
          .includes(searchText) ||
        car.type
          .toLowerCase()
          .includes(searchText) ||
        car.city
          .toLowerCase()
          .includes(searchText);

      return cityMatch && searchMatch;
    });
  }, [cars, selectedCity, search]);

  function handleConfirmBooking(data) {
    onBook(data);
    setBookingCar(null);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: C.navy,
      }}
    >
      {/* HEADER */}

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,255,255,.96)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                background: C.blue,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Car
                color="white"
                size={23}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 1000,
                  fontSize: 18,
                  color: C.navy,
                  lineHeight: 1.1,
                }}
              >
                SAWARIYA
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: C.blue,
                  fontWeight: 900,
                  letterSpacing: 1,
                }}
              >
                RENTALS
              </div>
            </div>
          </div>

          <a
            href="#cars"
            style={{
              textDecoration: "none",
              color: C.navy,
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            Browse Cars
          </a>
        </div>
      </header>

      {/* HERO */}

      <section
        style={{
          background:
            "linear-gradient(135deg,#eff6ff 0%,#ffffff 55%,#f0fdf4 100%)",
          padding: "48px 16px 38px",
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <Badge color={C.blue}>
            <Car size={13} />
            Easy Car Rental
          </Badge>

          <h1
            style={{
              margin: "16px auto 10px",
              maxWidth: 760,
              fontSize:
                "clamp(32px, 7vw, 58px)",
              lineHeight: 1.05,
              fontWeight: 1000,
              color: C.navy,
            }}
          >
            Rent a Car.
            <br />
            <span style={{ color: C.blue }}>
              Drive Your Way.
            </span>
          </h1>

          <p
            style={{
              maxWidth: 650,
              margin: "0 auto",
              color: C.gray,
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            Affordable and reliable self-drive car
            rentals from SAWARIYA RENTALS.
          </p>
        </div>
      </section>

      {/* SEARCH / FILTER */}

      <section
        id="cars"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "22px 16px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              position: "relative",
            }}
          >
            <Search
              size={18}
              color={C.gray}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform:
                  "translateY(-50%)",
              }}
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search cars..."
              style={{
                ...inputStyle,
                paddingLeft: 42,
              }}
            />
          </div>

          <select
            value={selectedCity}
            onChange={(e) =>
              setSelectedCity(e.target.value)
            }
            style={inputStyle}
          >
            <option value="All">
              All Cities
            </option>

            {activeCities.map((city) => (
              <option
                key={city.id}
                value={city.name}
              >
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* CARS */}

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 16px 60px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 25,
                fontWeight: 950,
              }}
            >
              Available Cars
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: C.gray,
                fontSize: 13,
              }}
            >
              {filteredCars.length} car
              {filteredCars.length !== 1
                ? "s"
                : ""}{" "}
              found
            </p>
          </div>
        </div>

        {filteredCars.length === 0 ? (
          <div
            style={{
              padding: 40,
              background: C.white,
              borderRadius: 20,
              border: `1px solid ${C.border}`,
              textAlign: "center",
              color: C.gray,
            }}
          >
            No cars found.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
              gap: 18,
            }}
          >
            {filteredCars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onBook={setBookingCar}
              />
            ))}
          </div>
        )}

        {/* RECENT BOOKINGS */}

        {bookings.length > 0 && (
          <section
            style={{
              marginTop: 40,
            }}
          >
            <h2
              style={{
                margin: "0 0 14px",
                fontSize: 22,
                fontWeight: 950,
              }}
            >
              Recent Bookings
            </h2>

            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {bookings
                .slice()
                .reverse()
                .slice(0, 5)
                .map((booking) => (
                  <div
                    key={booking.id}
                    style={{
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: 16,
                      padding: 15,
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent:
                        "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          color: C.navy,
                        }}
                      >
                        {booking.carName}
                      </strong>

                      <div
                        style={{
                          color: C.gray,
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        {booking.name} •{" "}
                        {booking.pickupDate} to{" "}
                        {booking.returnDate}
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 900,
                          color: C.green,
                        }}
                      >
                        Paid{" "}
                        {fmtINR(
                          booking.paidAmount
                        )}
                      </div>

                      <div
                        style={{
                          color: C.gray,
                          fontSize: 12,
                        }}
                      >
                        Remaining{" "}
                        {fmtINR(
                          booking.remainingAmount
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </main>

      {/* BOOKING MODAL */}

      {bookingCar && (
        <BookingModal
          car={bookingCar}
          onClose={() =>
            setBookingCar(null)
          }
          onConfirm={handleConfirmBooking}
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
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        padding: 18,
        display: "flex",
        alignItems: "center",
        gap: 13,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: `${color}12`,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
            color: C.gray,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {label}
        </div>

        <div
          style={{
            color: C.navy,
            fontSize: 22,
            fontWeight: 950,
            marginTop: 2,
            wordBreak: "break-word",
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
}) {
  const [tab, setTab] = useState("dashboard");

  const [editingCar, setEditingCar] =
    useState(null);

  const [carForm, setCarForm] = useState({
    name: "",
    type: "Hatchback",
    seats: 5,
    fuel: "Petrol",
    transmission: "Manual",
    price: "",
    city: "",
    photos: [],
    available: true,
  });

  const [newCity, setNewCity] =
    useState("");

  const totalCars = cars.length;

  const availableCars = cars.filter(
    (car) => car.available
  ).length;

  const rentedCars = cars.filter(
    (car) => !car.available
  ).length;

  const totalRevenue = bookings.reduce(
    (sum, booking) =>
      sum +
      Number(
        booking.paidAmount ??
          booking.total ??
          0
      ),
    0
  );

  const totalPending = bookings.reduce(
    (sum, booking) =>
      sum +
      Number(
        booking.remainingAmount ?? 0
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
      price: "",
      city:
        cities.find((c) => c.active)?.name ||
        "",
      photos: [],
      available: true,
    });
  }

  function editCar(car) {
    setEditingCar(car.id);

    setCarForm({
      name: car.name || "",
      type: car.type || "Hatchback",
      seats: car.seats || 5,
      fuel: car.fuel || "Petrol",
      transmission:
        car.transmission || "Manual",
      price: car.price || "",
      city: car.city || "",
      photos: car.photos || [],
      available:
        car.available !== false,
    });

    setTab("cars");
  }

  function saveCar(e) {
    e.preventDefault();

    if (!carForm.name.trim()) {
      alert("Enter car name.");
      return;
    }

    if (!carForm.city) {
      alert("Select a city.");
      return;
    }

    if (
      !carForm.price ||
      Number(carForm.price) <= 0
    ) {
      alert("Enter a valid daily price.");
      return;
    }

    if (editingCar) {
      setCars((prev) =>
        prev.map((car) =>
          car.id === editingCar
            ? {
                ...car,
                ...carForm,
                name: carForm.name.trim(),
                seats: Number(
                  carForm.seats
                ),
                price: Number(
                  carForm.price
                ),
              }
            : car
        )
      );
    } else {
      setCars((prev) => [
        ...prev,
        {
          id: uid("car"),
          ...carForm,
          name: carForm.name.trim(),
          seats: Number(carForm.seats),
          price: Number(carForm.price),
        },
      ]);
    }

    resetCarForm();
    alert(
      editingCar
        ? "Car updated successfully."
        : "Car added successfully."
    );
  }

  function deleteCar(id) {
    const car = cars.find(
      (item) => item.id === id
    );

    if (!car) return;

    const confirmed = window.confirm(
      `Delete ${car.name}?`
    );

    if (!confirmed) return;

    setCars((prev) =>
      prev.filter((item) => item.id !== id)
    );
  }

  function toggleAvailability(id) {
    setCars((prev) =>
      prev.map((car) =>
        car.id === id
          ? {
              ...car,
              available: !car.available,
            }
          : car
      )
    );
  }

  async function handlePhotoUpload(
    e,
    carId = null
  ) {
    const files = Array.from(
      e.target.files || []
    );

    if (!files.length) return;

    try {
      const compressed = [];

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          continue;
        }

        const image =
          await compressImage(file);

        compressed.push(image);
      }

      if (carId) {
        setCars((prev) =>
          prev.map((car) =>
            car.id === carId
              ? {
                  ...car,
                  photos: [
                    ...(car.photos || []),
                    ...compressed,
                  ],
                }
              : car
          )
        );
      } else {
        setCarForm((prev) => ({
          ...prev,
          photos: [
            ...(prev.photos || []),
            ...compressed,
          ],
        }));
      }
    } catch (error) {
      console.error(error);

      alert(
        "Unable to process the selected image."
      );
    }

    e.target.value = "";
  }

  function removeFormPhoto(index) {
    setCarForm((prev) => ({
      ...prev,
      photos: prev.photos.filter(
        (_, i) => i !== index
      ),
    }));
  }

  function removeCarPhoto(
    carId,
    index
  ) {
    setCars((prev) =>
      prev.map((car) =>
        car.id === carId
          ? {
              ...car,
              photos: (
                car.photos || []
              ).filter(
                (_, i) => i !== index
              ),
            }
          : car
      )
    );
  }

  function addCity(e) {
    e.preventDefault();

    const name = newCity.trim();

    if (!name) return;

    const exists = cities.some(
      (city) =>
        city.name.toLowerCase() ===
        name.toLowerCase()
    );

    if (exists) {
      alert("City already exists.");
      return;
    }

    setCities((prev) => [
      ...prev,
      {
        id: uid("city"),
        name,
        active: true,
      },
    ]);

    setNewCity("");
  }

  function toggleCity(id) {
    setCities((prev) =>
      prev.map((city) =>
        city.id === id
          ? {
              ...city,
              active: !city.active,
            }
          : city
      )
    );
  }

  function deleteCity(id) {
    const city = cities.find(
      (item) => item.id === id
    );

    if (!city) return;

    const used = cars.some(
      (car) => car.city === city.name
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

    setCities((prev) =>
      prev.filter(
        (item) => item.id !== id
      )
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: C.navy,
      }}
    >
      {/* ADMIN HEADER */}

      <header
        style={{
          background: C.navy,
          color: C.white,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "16px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Settings size={22} />

            <div>
              <div
                style={{
                  fontWeight: 950,
                  fontSize: 18,
                }}
              >
                SAWARIYA ADMIN
              </div>

              <div
                style={{
                  opacity: 0.7,
                  fontSize: 11,
                }}
              >
                Fleet & Booking Management
              </div>
            </div>
          </div>

          <Badge color="#38bdf8">
            <ShieldCheck size={13} />
            Admin Mode
          </Badge>
        </div>
      </header>

      {/* ADMIN NAV */}

      <div
        style={{
          background: C.white,
          borderBottom:
            `1px solid ${C.border}`,
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "10px 16px",
            display: "flex",
            gap: 8,
            overflowX: "auto",
          }}
        >
          {[
            ["dashboard", "Dashboard"],
            ["cars", "Vehicles"],
            ["bookings", "Bookings"],
            ["cities", "Cities"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              style={{
                border: "none",
                borderRadius: 12,
                padding:
                  "10px 14px",
                background:
                  tab === value
                    ? C.blue
                    : C.grayLight,
                color:
                  tab === value
                    ? C.white
                    : C.navy,
                fontWeight: 850,
                cursor: "pointer",
                whiteSpace:
                  "nowrap",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "22px 16px 60px",
        }}
      >
        {/* DASHBOARD */}

        {tab === "dashboard" && (
          <>
            <div
              style={{
                marginBottom: 18,
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 950,
                }}
              >
                Dashboard
              </h1>

              <p
                style={{
                  color: C.gray,
                  margin: "5px 0 0",
                }}
              >
                Overview of your rental
                business.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
                gap: 12,
              }}
            >
              <StatCard
                icon={<Car size={21} />}
                label="Total Vehicles"
                value={totalCars}
                color={C.blue}
              />

              <StatCard
                icon={
                  <CheckCircle2
                    size={21}
                  />
                }
                label="Available"
                value={availableCars}
                color={C.green}
              />

              <StatCard
                icon={
                  <Clock3 size={21} />
                }
                label="Rented"
                value={rentedCars}
                color={C.orange}
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
                color={C.green}
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
                color={C.orange}
              />

              <StatCard
                icon={
                  <CalendarDays
                    size={21}
                  />
                }
                label="Total Bookings"
                value={bookings.length}
                color={C.blue}
              />
            </div>
          </>
        )}

        {/* VEHICLES */}

        {tab === "cars" && (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 28,
                    fontWeight: 950,
                  }}
                >
                  Vehicles
                </h1>

                <p
                  style={{
                    color: C.gray,
                    margin: "5px 0 0",
                  }}
                >
                  Add cars, prices and
                  photos.
                </p>
              </div>

              <button
                onClick={resetCarForm}
                style={primaryButton}
              >
                <Plus size={17} />
                Add Vehicle
              </button>
            </div>

            {/* CAR FORM */}

            <div
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: 18,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 950,
                  }}
                >
                  {editingCar
                    ? "Edit Vehicle"
                    : "Add Vehicle"}
                </h2>

                {editingCar && (
                  <button
                    onClick={resetCarForm}
                    style={smallButton}
                  >
                    <X size={14} />
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={saveCar}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(180px, 100%), 1fr))",
                    gap: 13,
                  }}
                >
                  <div>
                    <label style={labelStyle}>
                      Car Name
                    </label>

                    <input
                      value={carForm.name}
                      onChange={(e) =>
                        setCarForm(
                          (prev) => ({
                            ...prev,
                            name:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="Maruti Swift"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Type
                    </label>

                    <select
                      value={carForm.type}
                      onChange={(e) =>
                        setCarForm(
                          (prev) => ({
                            ...prev,
                            type:
                              e.target.value,
                          })
                        )
                      }
                      style={inputStyle}
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
                    <label style={labelStyle}>
                      Seats
                    </label>

                    <input
                      type="number"
                      min="2"
                      max="12"
                      value={carForm.seats}
                      onChange={(e) =>
                        setCarForm(
                          (prev) => ({
                            ...prev,
                            seats:
                              e.target.value,
                          })
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Fuel
                    </label>

                    <select
                      value={carForm.fuel}
                      onChange={(e) =>
                        setCarForm(
                          (prev) => ({
                            ...prev,
                            fuel:
                              e.target.value,
                          })
                        )
                      }
                      style={inputStyle}
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
                    <label style={labelStyle}>
                      Transmission
                    </label>

                    <select
                      value={
                        carForm.transmission
                      }
                      onChange={(e) =>
                        setCarForm(
                          (prev) => ({
                            ...prev,
                            transmission:
                              e.target.value,
                          })
                        )
                      }
                      style={inputStyle}
                    >
                      <option>
                        Manual
                      </option>
                      <option>
                        Automatic
                      </option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Daily Price
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={carForm.price}
                      onChange={(e) =>
                        setCarForm(
                          (prev) => ({
                            ...prev,
                            price:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="1499"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      City
                    </label>

                    <select
                      value={carForm.city}
                      onChange={(e) =>
                        setCarForm(
                          (prev) => ({
                            ...prev,
                            city:
                              e.target.value,
                          })
                        )
                      }
                      style={inputStyle}
                    >
                      <option value="">
                        Select City
                      </option>

                      {cities
                        .filter(
                          (city) =>
                            city.active
                        )
                        .map((city) => (
                          <option
                            key={city.id}
                            value={
                              city.name
                            }
                          >
                            {city.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* PHOTO UPLOAD */}

                <div
                  style={{
                    marginTop: 18,
                    padding: 15,
                    borderRadius: 17,
                    background:
                      C.grayLight,
                    border:
                      `1px solid ${C.border}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent:
                        "space-between",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 900,
                          color: C.navy,
                        }}
                      >
                        Vehicle Photos
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: C.gray,
                          marginTop: 3,
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
                        cursor: "pointer",
                      }}
                    >
                      <ImagePlus size={15} />
                      Add Photos

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) =>
                          handlePhotoUpload(
                            e
                          )
                        }
                        style={{
                          display: "none",
                        }}
                      />
                    </label>
                  </div>

                  {carForm.photos.length >
                    0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(110px, 1fr))",
                        gap: 10,
                        marginTop: 14,
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
                              borderRadius: 12,
                              overflow:
                                "hidden",
                              background:
                                "#e2e8f0",
                            }}
                          >
                            <img
                              src={photo}
                              alt={`Vehicle ${
                                index + 1
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
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  <button
                    type="submit"
                    style={primaryButton}
                  >
                    <CheckCircle2
                      size={17}
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
                display: "grid",
                gap: 12,
              }}
            >
              {cars.map((car) => (
                <div
                  key={car.id}
                  style={{
                    background:
                      C.white,
                    border:
                      `1px solid ${C.border}`,
                    borderRadius: 18,
                    padding: 12,
                    display: "grid",
                    gridTemplateColumns:
                      "90px minmax(0,1fr)",
                    gap: 13,
                  }}
                >
                  <CarThumb
                    car={car}
                    size={90}
                  />

                  <div
                    style={{
                      minWidth: 0,
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
                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 16,
                            wordBreak:
                              "break-word",
                          }}
                        >
                          {car.name}
                        </strong>

                        <div
                          style={{
                            color:
                              C.gray,
                            fontSize: 12,
                            marginTop: 3,
                          }}
                        >
                          {car.type} •{" "}
                          {car.city} •{" "}
                          {fmtINR(
                            car.price
                          )}
                          /day
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
                        marginTop: 10,
                      }}
                    >
                      <button
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
                          size={14}
                        />
                        {car.available
                          ? "Mark Rented"
                          : "Mark Available"}
                      </button>

                      <button
                        onClick={() =>
                          editCar(car)
                        }
                        style={
                          smallButton
                        }
                      >
                        <Pencil
                          size={14}
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
                          size={14}
                        />
                        Add Photo

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) =>
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
                          size={14}
                        />
                        Delete
                      </button>
                    </div>

                    {/* EXISTING PHOTOS */}

                    {car.photos?.length >
                      0 && (
                      <div
                        style={{
                          display:
                            "flex",
                          flexWrap:
                            "wrap",
                          gap: 8,
                          marginTop: 12,
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
                                src={photo}
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
              ))}
            </div>
          </>
        )}

        {/* BOOKINGS */}

        {tab === "bookings" && (
          <>
            <div
              style={{
                marginBottom: 18,
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 950,
                }}
              >
                Bookings
              </h1>

              <p
                style={{
                  color: C.gray,
                  margin: "5px 0 0",
                }}
              >
                Payment and customer
                records.
              </p>
            </div>

            {bookings.length === 0 ? (
              <div
                style={{
                  background: C.white,
                  border:
                    `1px solid ${C.border}`,
                  borderRadius: 18,
                  padding: 40,
                  textAlign: "center",
                  color: C.gray,
                }}
              >
                No bookings yet.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                {bookings
                  .slice()
                  .reverse()
                  .map((booking) => (
                    <div
                      key={booking.id}
                      style={{
                        background:
                          C.white,
                        border:
                          `1px solid ${C.border}`,
                        borderRadius: 18,
                        padding: 16,
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
                              marginTop: 7,
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
                              marginTop: 5,
                              color:
                                C.gray,
                              fontSize:
                                13,
                            }}
                          >
                            {
                              booking.pickupDate
                            }{" "}
                            →{" "}
                            {
                              booking.returnDate
                            }{" "}
                            •{" "}
                            {booking.days}{" "}
                            day
                            {booking.days !==
                            1
                              ? "s"
                              : ""}
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
                          marginTop: 13,
                          paddingTop: 12,
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
                            size={12}
                          />

                          {booking.paymentType ===
                          "advance"
                            ? "₹500 Advance"
                            : "Full Payment"}
                        </Badge>

                        {booking.orderId && (
                          <Badge color={C.gray}>
                            Order:{" "}
                            {booking.orderId}
                          </Badge>
                        )}

                        {booking.paymentId && (
                          <Badge color={C.gray}>
                            Payment:{" "}
                            {
                              booking.paymentId
                            }
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        {/* CITIES */}

        {tab === "cities" && (
          <>
            <div
              style={{
                marginBottom: 18,
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 950,
                }}
              >
                Cities
              </h1>

              <p
                style={{
                  color: C.gray,
                  margin: "5px 0 0",
                }}
              >
                Manage rental locations.
              </p>
            </div>

            <form
              onSubmit={addCity}
              style={{
                background: C.white,
                border:
                  `1px solid ${C.border}`,
                borderRadius: 18,
                padding: 16,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <input
                value={newCity}
                onChange={(e) =>
                  setNewCity(
                    e.target.value
                  )
                }
                placeholder="Enter city name"
                style={{
                  ...inputStyle,
                  flex: "1 1 220px",
                }}
              />

              <button
                type="submit"
                style={primaryButton}
              >
                <Plus size={16} />
                Add City
              </button>
            </form>

            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 16,
              }}
            >
              {cities.map((city) => (
                <div
                  key={city.id}
                  style={{
                    background: C.white,
                    border:
                      `1px solid ${C.border}`,
                    borderRadius: 16,
                    padding: 14,
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      gap: 10,
                    }}
                  >
                    <MapPin
                      size={19}
                      color={C.blue}
                    />

                    <strong>
                      {city.name}
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
                      display: "flex",
                      flexWrap:
                        "wrap",
                      gap: 7,
                    }}
                  >
                    <button
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
                        size={14}
                      />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
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
}) {
  const [passcode, setPasscode] =
    useState("");

  const [loggedIn, setLoggedIn] =
    useState(false);

  function login(e) {
    e.preventDefault();

    if (passcode === ADMIN_PASSCODE) {
      setLoggedIn(true);
      setPasscode("");
    } else {
      alert("Incorrect admin passcode.");
    }
  }

  if (loggedIn) {
    return (
      <AdminView
        cars={cars}
        setCars={setCars}
        cities={cities}
        setCities={setCities}
        bookings={bookings}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#eff6ff,#f8fafc)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <form
        onSubmit={login}
        style={{
          width: "100%",
          maxWidth: 420,
          background: C.white,
          border:
            `1px solid ${C.border}`,
          borderRadius: 24,
          padding: 24,
          boxShadow:
            "0 20px 60px rgba(15,23,42,.10)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: C.navy,
            color: C.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <ShieldCheck size={27} />
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 25,
            fontWeight: 950,
            color: C.navy,
          }}
        >
          Admin Login
        </h1>

        <p
          style={{
            color: C.gray,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Enter your admin passcode to
          manage vehicles, bookings and
          cities.
        </p>

        <label style={labelStyle}>
          Admin Passcode
        </label>

        <input
          type="password"
          value={passcode}
          onChange={(e) =>
            setPasscode(
              e.target.value
            )
          }
          placeholder="Enter passcode"
          style={inputStyle}
          autoFocus
        />

        <button
          type="submit"
          style={{
            ...primaryButton,
            width: "100%",
            marginTop: 14,
          }}
        >
          <ShieldCheck size={18} />
          Login
        </button>

        <div
          style={{
            marginTop: 12,
            textAlign: "center",
            color: C.gray,
            fontSize: 11,
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
  const [cars, setCars] = useState(() =>
    loadShared("sawariya_cars", seedCars)
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

  const [isAdmin, setIsAdmin] =
    useState(false);

  /* -----------------------------------------------
     SAVE DATA
  ------------------------------------------------ */

  useEffect(() => {
    saveShared(
      "sawariya_cars",
      cars
    );
  }, [cars]);

  useEffect(() => {
    saveShared(
      "sawariya_cities",
      cities
    );
  }, [cities]);

  useEffect(() => {
    saveShared(
      "sawariya_bookings",
      bookings
    );
  }, [bookings]);

  /* -----------------------------------------------
     CONFIRM BOOKING
  ------------------------------------------------ */

  function confirmBooking(data) {
    const booking = {
      id: uid("booking"),
      createdAt:
        new Date().toISOString(),
      ...data,
    };

    setBookings((prev) => [
      ...prev,
      booking,
    ]);

    /*
      Once a booking is successfully paid and
      verified, mark that vehicle as rented.
    */

    setCars((prev) =>
      prev.map((car) =>
        car.id === data.carId
          ? {
              ...car,
              available: false,
            }
          : car
      )
    );
  }

  /* -----------------------------------------------
     ADMIN TOGGLE
  ------------------------------------------------ */

  if (isAdmin) {
    return (
      <div>
        <div
          style={{
            position: "fixed",
            right: 14,
            bottom: 14,
            zIndex: 2000,
          }}
        >
          <button
            onClick={() =>
              setIsAdmin(false)
            }
            style={{
              ...secondaryButton,
              boxShadow:
                "0 10px 30px rgba(0,0,0,.15)",
            }}
          >
            <X size={16} />
            Exit Admin
          </button>
        </div>

        <AdminGate
          cars={cars}
          setCars={setCars}
          cities={cities}
          setCities={setCities}
          bookings={bookings}
        />
      </div>
    );
  }

  return (
    <div>
      <CustomerView
        cars={cars}
        cities={cities}
        bookings={bookings}
        onBook={confirmBooking}
      />

      {/* SECRET / ADMIN BUTTON */}

      <button
        onClick={() => setIsAdmin(true)}
        title="Admin"
        style={{
          position: "fixed",
          right: 12,
          bottom: 12,
          width: 42,
          height: 42,
          borderRadius: 999,
          border: `1px solid ${C.border}`,
          background:
            "rgba(255,255,255,.94)",
          color: C.gray,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow:
            "0 8px 25px rgba(15,23,42,.12)",
          zIndex: 100,
        }}
      >
        <Settings size={18} />
      </button>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: C.navy,
  fontSize: 12,
  fontWeight: 850,
  marginBottom: 7,
};

const inputStyle = {
  width: "100%",
  minWidth: 0,
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
  boxSizing: "border-box",
};

const secondaryButton = {
  minHeight: 44,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: "10px 15px",
  background: C.white,
  color: C.navy,
  fontSize: 14,
  fontWeight: 850,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  cursor: "pointer",
  boxSizing: "border-box",
};

const dangerButton = {
  minHeight: 38,
  border: `1px solid #fecaca`,
  borderRadius: 10,
  padding: "8px 11px",
  background: C.redLight,
  color: C.red,
  fontSize: 12,
  fontWeight: 850,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  cursor: "pointer",
  boxSizing: "border-box",
};

const smallButton = {
  minHeight: 38,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: "8px 11px",
  background: C.white,
  color: C.navy,
  fontSize: 12,
  fontWeight: 850,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  cursor: "pointer",
  boxSizing: "border-box",
};

/* =========================================================
   EXPORT
========================================================= */

export default App;
