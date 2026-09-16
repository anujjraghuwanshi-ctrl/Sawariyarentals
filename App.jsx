import React, { useEffect, useRef, useState } from "react";
import {
  Car,
  MapPin,
  Fuel,
  Users,
  Settings2,
  IndianRupee,
  ShieldCheck,
  Search,
  Plus,
  Trash2,
  Power,
  LogOut,
  Lock,
  X,
  CheckCircle2,
  Camera,
  Upload,
  Image as ImageIcon,
  Pencil,
} from "lucide-react";

/* =========================================================
   SAWARIYA RENTALS
   Complete App.jsx

   PAYMENT:
   Customer can choose:
   1. ₹500 Booking Advance
   2. Full Rental Amount

   PHOTO:
   Admin can add/change/remove vehicle photos.
   ========================================================= */

const C = {
  dark: "#111827",
  dark2: "#1f2937",
  orange: "#f97316",
  orangeDark: "#ea580c",
  light: "#f8fafc",
  white: "#ffffff",
  gray: "#64748b",
  gray2: "#94a3b8",
  border: "#e2e8f0",
  green: "#16a34a",
  red: "#dc2626",
  yellow: "#ca8a04",
  blue: "#2563eb",
};

const ADMIN_PASSCODE = "1234";
const BOOKING_ADVANCE = 500;

/* =========================================================
   SEED DATA
   ========================================================= */

const seedCars = [
  {
    id: "car-1",
    name: "Maruti Swift",
    city: "Bhopal",
    type: "Hatchback",
    price: 1499,
    fuel: "Petrol",
    transmission: "Manual",
    seats: 5,
    status: "available",
    image: "",
  },
  {
    id: "car-2",
    name: "Hyundai Creta",
    city: "Bhopal",
    type: "SUV",
    price: 2499,
    fuel: "Petrol",
    transmission: "Automatic",
    seats: 5,
    status: "available",
    image: "",
  },
  {
    id: "car-3",
    name: "Maruti Ertiga",
    city: "Indore",
    type: "MPV",
    price: 2299,
    fuel: "Petrol",
    transmission: "Manual",
    seats: 7,
    status: "available",
    image: "",
  },
  {
    id: "car-4",
    name: "Toyota Innova Crysta",
    city: "Bhopal",
    type: "SUV",
    price: 3499,
    fuel: "Diesel",
    transmission: "Manual",
    seats: 7,
    status: "available",
    image: "",
  },
  {
    id: "car-5",
    name: "Hyundai i20",
    city: "Indore",
    type: "Hatchback",
    price: 1699,
    fuel: "Petrol",
    transmission: "Manual",
    seats: 5,
    status: "available",
    image: "",
  },
  {
    id: "car-6",
    name: "Mahindra Scorpio",
    city: "Bhopal",
    type: "SUV",
    price: 2999,
    fuel: "Diesel",
    transmission: "Manual",
    seats: 7,
    status: "available",
    image: "",
  },
];

const seedCities = [
  "Bhopal",
  "Indore",
  "Jabalpur",
  "Ujjain",
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
  return `₹${Number(value || 0).toLocaleString(
    "en-IN"
  )}`;
}

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();

  return new Date(
    d.getTime() - offset * 60000
  )
    .toISOString()
    .slice(0, 10);
}

function addDaysISO(dateString, days) {
  const d = new Date(
    `${dateString}T00:00:00`
  );

  d.setDate(
    d.getDate() + Number(days || 0)
  );

  const offset = d.getTimezoneOffset();

  return new Date(
    d.getTime() - offset * 60000
  )
    .toISOString()
    .slice(0, 10);
}

function daysBetween(start, end) {
  if (!start || !end) return 0;

  const a = new Date(
    `${start}T00:00:00`
  );

  const b = new Date(
    `${end}T00:00:00`
  );

  const diff = Math.round(
    (b - a) / 86400000
  );

  return Math.max(1, diff);
}

/* =========================================================
   STORAGE
   ========================================================= */

async function loadShared(key, fallback) {
  try {
    if (
      typeof window !== "undefined" &&
      window.storage
    ) {
      const result =
        await window.storage.get(key);

      if (result && result.value) {
        return JSON.parse(result.value);
      }
    }
  } catch (error) {
    console.warn(
      "Shared storage unavailable:",
      error
    );
  }

  try {
    const local =
      localStorage.getItem(key);

    if (local) {
      return JSON.parse(local);
    }
  } catch (error) {
    console.warn(
      "Local storage unavailable:",
      error
    );
  }

  return fallback;
}

async function saveShared(key, value) {
  const stringValue =
    JSON.stringify(value);

  try {
    if (
      typeof window !== "undefined" &&
      window.storage
    ) {
      await window.storage.set(
        key,
        stringValue
      );

      return true;
    }
  } catch (error) {
    console.warn(
      "Shared storage save failed:",
      error
    );
  }

  try {
    localStorage.setItem(
      key,
      stringValue
    );

    return true;
  } catch (error) {
    console.error(
      "Local storage save failed:",
      error
    );

    return false;
  }
}

/* =========================================================
   IMAGE COMPRESSION
   ========================================================= */

function compressImage(
  file,
  maxSize = 1000,
  quality = 0.75
) {
  return new Promise(
    (resolve, reject) => {
      if (!file) {
        reject(
          new Error(
            "No image selected."
          )
        );

        return;
      }

      if (
        !file.type.startsWith("image/")
      ) {
        reject(
          new Error(
            "Please select an image file."
          )
        );

        return;
      }

      const reader =
        new FileReader();

      reader.onload = () => {
        const image = new Image();

        image.onload = () => {
          let width = image.width;
          let height = image.height;

          const largestSide =
            Math.max(width, height);

          if (
            largestSide > maxSize
          ) {
            const scale =
              maxSize / largestSide;

            width = Math.round(
              width * scale
            );

            height = Math.round(
              height * scale
            );
          }

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width = width;
          canvas.height = height;

          const ctx =
            canvas.getContext(
              "2d"
            );

          if (!ctx) {
            reject(
              new Error(
                "Could not process image."
              )
            );

            return;
          }

          ctx.drawImage(
            image,
            0,
            0,
            width,
            height
          );

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(
                  new Error(
                    "Could not compress image."
                  )
                );

                return;
              }

              const blobReader =
                new FileReader();

              blobReader.onloadend =
                () => {
                  resolve(
                    blobReader.result
                  );
                };

              blobReader.onerror =
                () => {
                  reject(
                    new Error(
                      "Could not read compressed image."
                    )
                  );
                };

              blobReader.readAsDataURL(
                blob
              );
            },
            "image/jpeg",
            quality
          );
        };

        image.onerror = () => {
          reject(
            new Error(
              "Could not load this image."
            )
          );
        };

        image.src = reader.result;
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Could not read selected image."
          )
        );
      };

      reader.readAsDataURL(file);
    }
  );
}

/* =========================================================
   SMALL UI
   ========================================================= */

function Badge({
  children,
  tone = "gray",
}) {
  const tones = {
    gray: {
      bg: "#f1f5f9",
      color: "#475569",
    },
    green: {
      bg: "#dcfce7",
      color: "#166534",
    },
    red: {
      bg: "#fee2e2",
      color: "#991b1b",
    },
    orange: {
      bg: "#ffedd5",
      color: "#9a3412",
    },
    blue: {
      bg: "#dbeafe",
      color: "#1d4ed8",
    },
  };

  const t =
    tones[tone] || tones.gray;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 9px",
        borderRadius: 999,
        background: t.bg,
        color: t.color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

/* =========================================================
   CAR THUMB
   ========================================================= */

function CarThumb({
  car,
  height = 190,
}) {
  if (car.image) {
    return (
      <div
        style={{
          width: "100%",
          height,
          borderRadius: 18,
          overflow: "hidden",
          background: "#e2e8f0",
        }}
      >
        <img
          src={car.image}
          alt={car.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 18,
        overflow: "hidden",
        background:
          "linear-gradient(135deg,#e2e8f0 0%,#cbd5e1 100%)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Car
        size={95}
        strokeWidth={1.25}
        color="#475569"
      />

      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          right: 12,
          background:
            "rgba(255,255,255,.88)",
          borderRadius: 10,
          padding: "7px 10px",
          fontWeight: 800,
          fontSize: 13,
          color: C.dark,
          textAlign: "center",
        }}
      >
        {car.name}
      </div>
    </div>
  );
}

/* =========================================================
   CAR CARD
   ========================================================= */

function CarCard({
  car,
  onBook,
}) {
  return (
    <div
      style={{
        background: C.white,
        border:
          `1px solid ${C.border}`,
        borderRadius: 20,
        overflow: "hidden",
        boxShadow:
          "0 8px 30px rgba(15,23,42,.06)",
      }}
    >
      <CarThumb car={car} />

      <div style={{ padding: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 19,
                fontWeight: 900,
                color: C.dark,
              }}
            >
              {car.name}
            </h3>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginTop: 5,
                color: C.gray,
                fontSize: 13,
              }}
            >
              <MapPin size={14} />
              {car.city}
            </div>
          </div>

          <Badge
            tone={
              car.status ===
              "available"
                ? "green"
                : "red"
            }
          >
            {car.status ===
            "available"
              ? "Available"
              : "Rented"}
          </Badge>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 9,
            marginTop: 16,
          }}
        >
          <Badge>
            <Car size={13} />
            {car.type}
          </Badge>

          <Badge>
            <Fuel size={13} />
            {car.fuel}
          </Badge>

          <Badge>
            <Settings2 size={13} />
            {car.transmission}
          </Badge>

          <Badge>
            <Users size={13} />
            {car.seats} seats
          </Badge>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: 12,
            marginTop: 18,
          }}
        >
          <div>
            <div
              style={{
                color: C.gray,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Starting from
            </div>

            <div
              style={{
                color: C.dark,
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              {fmtINR(car.price)}

              <span
                style={{
                  fontSize: 12,
                  color: C.gray,
                  fontWeight: 700,
                }}
              >
                {" "}
                / day
              </span>
            </div>
          </div>

          <button
            disabled={
              car.status !==
              "available"
            }
            onClick={() =>
              onBook(car)
            }
            style={{
              border: 0,
              borderRadius: 12,
              padding:
                "11px 15px",
              background:
                car.status ===
                "available"
                  ? C.orange
                  : "#cbd5e1",
              color: C.white,
              fontWeight: 900,
              cursor:
                car.status ===
                "available"
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            {car.status ===
            "available"
              ? "Book Now"
              : "Unavailable"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   BOOKING MODAL
   ========================================================= */

function BookingModal({
  car,
  onClose,
  onConfirm,
}) {
  const [customer, setCustomer] =
    useState({
      name: "",
      phone: "",
      email: "",
    });

  const [startDate, setStartDate] =
    useState(todayISO());

  const [endDate, setEndDate] =
    useState(
      addDaysISO(
        todayISO(),
        1
      )
    );

  const [paymentChoice, setPaymentChoice] =
    useState("advance");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const days = daysBetween(
    startDate,
    endDate
  );

  const total =
    days *
    Number(car.price || 0);

  /*
    Customer can pay ₹500 advance.

    If total is below ₹500, we charge
    only the total amount instead.
  */
  const advanceAmount =
    Math.min(
      BOOKING_ADVANCE,
      total
    );

  const paymentAmount =
    paymentChoice === "advance"
      ? advanceAmount
      : total;

  const remainingAmount =
    Math.max(
      0,
      total - paymentAmount
    );

  function updateCustomer(e) {
    const {
      name,
      value,
    } = e.target;

    setCustomer((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function loadRazorpay() {
    if (window.Razorpay) {
      return true;
    }

    return new Promise(
      (resolve) => {
        const script =
          document.createElement(
            "script"
          );

        script.src =
          "https://checkout.razorpay.com/v1/checkout.js";

        script.onload = () =>
          resolve(true);

        script.onerror = () =>
          resolve(false);

        document.body.appendChild(
          script
        );
      }
    );
  }

  async function handlePayment() {
    setError("");

    if (!customer.name.trim()) {
      setError(
        "Please enter your name."
      );
      return;
    }

    if (!customer.phone.trim()) {
      setError(
        "Please enter your phone number."
      );
      return;
    }

    if (!/^\d{10}$/.test(
      customer.phone.trim()
    )) {
      setError(
        "Please enter a valid 10 digit mobile number."
      );
      return;
    }

    if (!customer.email.trim()) {
      setError(
        "Please enter your email."
      );
      return;
    }

    if (
      !startDate ||
      !endDate
    ) {
      setError(
        "Please select rental dates."
      );
      return;
    }

    if (endDate < startDate) {
      setError(
        "Return date cannot be before pickup date."
      );
      return;
    }

    if (paymentAmount <= 0) {
      setError(
        "Invalid payment amount."
      );
      return;
    }

    const keyId =
      import.meta.env
        .VITE_RAZORPAY_KEY_ID;

    if (!keyId) {
      setError(
        "Razorpay key is missing. Add VITE_RAZORPAY_KEY_ID in Vercel environment variables."
      );
      return;
    }

    setLoading(true);

    try {
      const loaded =
        await loadRazorpay();

      if (!loaded) {
        throw new Error(
          "Razorpay checkout could not be loaded."
        );
      }

      /*
        IMPORTANT:

        This sends the SELECTED payment amount
        to your backend.

        Advance:
        ₹500

        Full:
        Complete rental amount
      */

      const orderResponse =
        await fetch(
          "/api/create-order",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              amount:
                paymentAmount,
              receipt:
                `receipt_${Date.now()}`,
            }),
          }
        );

      if (!orderResponse.ok) {
        throw new Error(
          "Unable to create payment order."
        );
      }

      const orderData =
        await orderResponse.json();

      if (!orderData.id) {
        throw new Error(
          "Payment order ID was not returned."
        );
      }

      const options = {
        key: keyId,

        amount:
          orderData.amount,

        currency:
          orderData.currency ||
          "INR",

        name:
          "SAWARIYA RENTALS",

        description:
          paymentChoice ===
          "advance"
            ? `₹${advanceAmount} booking advance - ${car.name}`
            : `Full payment - ${car.name}`,

        order_id:
          orderData.id,

        prefill: {
          name:
            customer.name,
          email:
            customer.email,
          contact:
            customer.phone,
        },

        theme: {
          color: C.orange,
        },

        handler:
          async function (
            response
          ) {
            try {
              const verifyResponse =
                await fetch(
                  "/api/verify-payment",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type":
                        "application/json",
                    },
                    body: JSON.stringify(
                      response
                    ),
                  }
                );

              const verifyData =
                await verifyResponse.json();

              if (
                !verifyResponse.ok ||
                !verifyData.verified
              ) {
                throw new Error(
                  "Payment verification failed."
                );
              }

              /*
                Only after successful verification
                do we confirm the booking.
              */

              onConfirm({
                car,
                customer,
                startDate,
                endDate,
                days,
                total,

                paymentType:
                  paymentChoice ===
                  "advance"
                    ? "Booking Advance"
                    : "Full Payment",

                paidAmount:
                  paymentAmount,

                advancePaid:
                  paymentChoice ===
                  "advance"
                    ? paymentAmount
                    : total,

                remainingAmount,

                paymentId:
                  response.razorpay_payment_id ||
                  "",

                orderId:
                  response.razorpay_order_id ||
                  "",

                signature:
                  response.razorpay_signature ||
                  "",
              });
            } catch (
              verificationError
            ) {
              setLoading(false);

              setError(
                verificationError.message ||
                  "Payment verification failed."
              );
            }
          },

        modal: {
          ondismiss:
            function () {
              setLoading(false);
            },
        },
      };

      const razorpay =
        new window.Razorpay(
          options
        );

      razorpay.on(
        "payment.failed",
        function () {
          setLoading(false);

          setError(
            "Payment failed. Please try again."
          );
        }
      );

      razorpay.open();
    } catch (err) {
      console.error(err);

      setLoading(false);

      setError(
        err.message ||
          "Something went wrong while starting payment."
      );
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background:
          "rgba(15,23,42,.65)",
        display: "flex",
        alignItems: "center",
        justifyContent:
          "center",
        padding: 16,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: C.white,
          borderRadius: 24,
          boxShadow:
            "0 30px 80px rgba(0,0,0,.25)",
          overflow: "hidden",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            padding: 20,
            borderBottom:
              `1px solid ${C.border}`,
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: C.dark,
                fontSize: 22,
              }}
            >
              Book {car.name}
            </h2>

            <div
              style={{
                color: C.gray,
                fontSize: 13,
                marginTop: 4,
              }}
            >
              {car.city} ·{" "}
              {fmtINR(car.price)}{" "}
              / day
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border:
                `1px solid ${C.border}`,
              background: C.white,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* PHOTO */}

          {car.image && (
            <img
              src={car.image}
              alt={car.name}
              style={{
                width: "100%",
                height: 180,
                objectFit: "cover",
                borderRadius: 16,
                marginBottom: 18,
              }}
            />
          )}

          {/* CUSTOMER */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(200px,1fr))",
              gap: 14,
            }}
          >
            <label>
              <div
                style={labelStyle}
              >
                Full Name
              </div>

              <input
                name="name"
                value={
                  customer.name
                }
                onChange={
                  updateCustomer
                }
                placeholder="Your name"
                style={inputStyle}
              />
            </label>

            <label>
              <div
                style={labelStyle}
              >
                Phone
              </div>

              <input
                name="phone"
                value={
                  customer.phone
                }
                onChange={
                  updateCustomer
                }
                placeholder="10 digit mobile number"
                inputMode="tel"
                maxLength={10}
                style={inputStyle}
              />
            </label>

            <label
              style={{
                gridColumn:
                  "1 / -1",
              }}
            >
              <div
                style={labelStyle}
              >
                Email
              </div>

              <input
                name="email"
                value={
                  customer.email
                }
                onChange={
                  updateCustomer
                }
                placeholder="you@example.com"
                type="email"
                style={inputStyle}
              />
            </label>

            <label>
              <div
                style={labelStyle}
              >
                Pickup Date
              </div>

              <input
                type="date"
                min={todayISO()}
                value={startDate}
                onChange={(e) => {
                  const value =
                    e.target.value;

                  setStartDate(
                    value
                  );

                  if (
                    endDate < value
                  ) {
                    setEndDate(
                      addDaysISO(
                        value,
                        1
                      )
                    );
                  }
                }}
                style={inputStyle}
              />
            </label>

            <label>
              <div
                style={labelStyle}
              >
                Return Date
              </div>

              <input
                type="date"
                min={startDate}
                value={endDate}
                onChange={(e) =>
                  setEndDate(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </label>
          </div>

          {/* TOTAL */}

          <div
            style={{
              marginTop: 20,
              padding: 18,
              background:
                "#f8fafc",
              border:
                `1px solid ${C.border}`,
              borderRadius: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  color: C.gray,
                }}
              >
                Daily rate
              </span>

              <strong>
                {fmtINR(
                  car.price
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  color: C.gray,
                }}
              >
                Rental days
              </span>

              <strong>
                {days}
              </strong>
            </div>

            <div
              style={{
                borderTop:
                  `1px solid ${C.border}`,
                paddingTop: 12,
                marginTop: 10,
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <strong>
                Total Rental Amount
              </strong>

              <strong
                style={{
                  color:
                    C.orangeDark,
                  fontSize: 20,
                }}
              >
                {fmtINR(total)}
              </strong>
            </div>
          </div>

          {/* PAYMENT OPTIONS */}

          <div
            style={{
              marginTop: 20,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 900,
                color: C.dark,
                marginBottom: 10,
              }}
            >
              Choose Payment Option
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(230px,1fr))",
                gap: 12,
              }}
            >
              {/* ADVANCE */}

              <button
                type="button"
                onClick={() =>
                  setPaymentChoice(
                    "advance"
                  )
                }
                disabled={
                  total < 500
                }
                style={{
                  textAlign:
                    "left",
                  padding: 16,
                  borderRadius: 15,
                  border:
                    paymentChoice ===
                    "advance"
                      ? `2px solid ${C.orange}`
                      : `1px solid ${C.border}`,
                  background:
                    paymentChoice ===
                    "advance"
                      ? "#fff7ed"
                      : C.white,
                  cursor:
                    total < 500
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    total < 500
                      ? 0.55
                      : 1,
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
                  }}
                >
                  <strong>
                    ₹500 Booking Advance
                  </strong>

                  {paymentChoice ===
                    "advance" && (
                    <CheckCircle2
                      size={20}
                      color={
                        C.orange
                      }
                    />
                  )}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 24,
                    fontWeight: 900,
                    color:
                      C.orangeDark,
                  }}
                >
                  {fmtINR(
                    advanceAmount
                  )}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    color: C.gray,
                    fontSize: 12,
                    lineHeight: 1.4,
                  }}
                >
                  Pay ₹500 now to
                  confirm your
                  booking. Pay the
                  remaining amount
                  later.
                </div>
              </button>

              {/* FULL */}

              <button
                type="button"
                onClick={() =>
                  setPaymentChoice(
                    "full"
                  )
                }
                style={{
                  textAlign:
                    "left",
                  padding: 16,
                  borderRadius: 15,
                  border:
                    paymentChoice ===
                    "full"
                      ? `2px solid ${C.orange}`
                      : `1px solid ${C.border}`,
                  background:
                    paymentChoice ===
                    "full"
                      ? "#fff7ed"
                      : C.white,
                  cursor:
                    "pointer",
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
                  }}
                >
                  <strong>
                    Pay Full Amount
                  </strong>

                  {paymentChoice ===
                    "full" && (
                    <CheckCircle2
                      size={20}
                      color={
                        C.orange
                      }
                    />
                  )}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 24,
                    fontWeight: 900,
                    color:
                      C.orangeDark,
                  }}
                >
                  {fmtINR(total)}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    color: C.gray,
                    fontSize: 12,
                    lineHeight: 1.4,
                  }}
                >
                  Pay the complete
                  rental amount now.
                  Nothing will be
                  remaining.
                </div>
              </button>
            </div>
          </div>

          {/* PAYMENT SUMMARY */}

          <div
            style={{
              marginTop: 15,
              padding: 16,
              borderRadius: 15,
              background:
                paymentChoice ===
                "advance"
                  ? "#eff6ff"
                  : "#ecfdf5",
              border:
                paymentChoice ===
                "advance"
                  ? "1px solid #bfdbfe"
                  : "1px solid #bbf7d0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom: 8,
              }}
            >
              <span>
                Amount payable now
              </span>

              <strong
                style={{
                  fontSize: 19,
                }}
              >
                {fmtINR(
                  paymentAmount
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                Remaining amount
              </span>

              <strong
                style={{
                  color:
                    remainingAmount >
                    0
                      ? C.red
                      : C.green,
                }}
              >
                {fmtINR(
                  remainingAmount
                )}
              </strong>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                background:
                  "#fee2e2",
                color:
                  "#991b1b",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          {/* PAY */}

          <button
            onClick={
              handlePayment
            }
            disabled={loading}
            style={{
              width: "100%",
              marginTop: 18,
              border: 0,
              borderRadius: 14,
              padding: 15,
              background: loading
                ? "#94a3b8"
                : C.orange,
              color: C.white,
              fontSize: 16,
              fontWeight: 900,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Processing..."
              : `Pay ${fmtINR(
                  paymentAmount
                )} & Confirm Booking`}
          </button>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              gap: 6,
              color: C.gray,
              fontSize: 12,
            }}
          >
            <ShieldCheck
              size={15}
            />
            Secure payment powered
            by Razorpay
          </div>
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
}) {
  const [search, setSearch] =
    useState("");

  const [city, setCity] =
    useState("All");

  const [type, setType] =
    useState("All");

  const [bookingCar, setBookingCar] =
    useState(null);

  const filteredCars =
    cars.filter((car) => {
      const matchesSearch =
        !search ||
        car.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        car.type
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesCity =
        city === "All" ||
        car.city === city;

      const matchesType =
        type === "All" ||
        car.type === type;

      return (
        matchesSearch &&
        matchesCity &&
        matchesType
      );
    });

  const types = [
    "All",
    ...Array.from(
      new Set(
        cars.map(
          (car) => car.type
        )
      )
    ),
  ];

  function handleConfirmBooking(
    data
  ) {
    /*
      Parent App handles the actual
      booking storage.
    */

    if (
      typeof window !==
      "undefined" &&
      window.__SAWARIYA_CONFIRM_BOOKING__
    ) {
      window.__SAWARIYA_CONFIRM_BOOKING__(
        data
      );
    }

    setBookingCar(null);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.light,
      }}
    >
      {/* HERO */}

      <section
        style={{
          background: C.dark,
          color: C.white,
          padding:
            "56px 20px 48px",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              maxWidth: 700,
            }}
          >
            <div
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 8,
                padding:
                  "7px 11px",
                borderRadius: 999,
                background:
                  "rgba(249,115,22,.15)",
                color:
                  "#fdba74",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              <Car size={14} />
              SAWARIYA RENTALS
            </div>

            <h1
              style={{
                fontSize:
                  "clamp(34px,6vw,64px)",
                lineHeight: 1.02,
                margin:
                  "18px 0 14px",
                letterSpacing:
                  "-2px",
              }}
            >
              Rent a car.
              <br />
              <span
                style={{
                  color: C.orange,
                }}
              >
                Drive your way.
              </span>
            </h1>

            <p
              style={{
                color:
                  "#cbd5e1",
                fontSize: 17,
                lineHeight: 1.6,
                margin: 0,
                maxWidth: 600,
              }}
            >
              Simple, transparent
              car rentals across
              your city. Choose your
              vehicle and book in
              minutes.
            </p>
          </div>
        </div>
      </section>

      <main
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding:
            "24px 20px 60px",
        }}
      >
        {/* SEARCH */}

        <div
          style={{
            background: C.white,
            border:
              `1px solid ${C.border}`,
            borderRadius: 18,
            padding: 14,
            display: "grid",
            gridTemplateColumns:
              "minmax(200px,2fr) repeat(2,minmax(140px,1fr))",
            gap: 10,
            boxShadow:
              "0 8px 25px rgba(15,23,42,.05)",
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
              color={C.gray}
              style={{
                position:
                  "absolute",
                left: 13,
                top: 13,
              }}
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search cars..."
              style={{
                ...inputStyle,
                paddingLeft: 42,
              }}
            />
          </div>

          <select
            value={city}
            onChange={(e) =>
              setCity(
                e.target.value
              )
            }
            style={inputStyle}
          >
            <option value="All">
              All cities
            </option>

            {cities.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>

          <select
            value={type}
            onChange={(e) =>
              setType(
                e.target.value
              )
            }
            style={inputStyle}
          >
            {types.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item === "All"
                    ? "All vehicle types"
                    : item}
                </option>
              )
            )}
          </select>
        </div>

        {/* TITLE */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            margin:
              "28px 0 16px",
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 25,
                color: C.dark,
              }}
            >
              Available cars
            </h2>

            <p
              style={{
                margin:
                  "5px 0 0",
                color: C.gray,
                fontSize: 13,
              }}
            >
              {
                filteredCars.length
              }{" "}
              vehicle
              {filteredCars.length ===
              1
                ? ""
                : "s"}{" "}
              found
            </p>
          </div>

          <Badge tone="green">
            <CheckCircle2
              size={14}
            />
            Ready to book
          </Badge>
        </div>

        {/* CARS */}

        {filteredCars.length ===
        0 ? (
          <div
            style={{
              background:
                C.white,
              border:
                `1px solid ${C.border}`,
              borderRadius: 18,
              padding: 50,
              textAlign:
                "center",
              color: C.gray,
            }}
          >
            No cars match your
            search.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(280px,1fr))",
              gap: 20,
            }}
          >
            {filteredCars.map(
              (car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  onBook={
                    setBookingCar
                  }
                />
              )
            )}
          </div>
        )}

        {/* RECENT BOOKINGS */}

        {bookings.length > 0 && (
          <div
            style={{
              marginTop: 45,
              padding: 20,
              background:
                C.white,
              border:
                `1px solid ${C.border}`,
              borderRadius: 18,
            }}
          >
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: 9,
              }}
            >
              <CheckCircle2
                color={C.green}
              />

              <strong
                style={{
                  fontSize: 18,
                }}
              >
                Recent bookings
              </strong>
            </div>

            <div
              style={{
                marginTop: 15,
                display: "grid",
                gap: 10,
              }}
            >
              {bookings
                .slice(-3)
                .reverse()
                .map(
                  (booking) => (
                    <div
                      key={
                        booking.id
                      }
                      style={{
                        padding: 13,
                        background:
                          "#f8fafc",
                        borderRadius: 12,
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        flexWrap:
                          "wrap",
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
                            fontSize: 12,
                            marginTop: 3,
                          }}
                        >
                          {
                            booking.startDate
                          }{" "}
                          →
                          {
                            booking.endDate
                          }
                        </div>

                        <div
                          style={{
                            color:
                              C.gray,
                            fontSize: 11,
                            marginTop: 4,
                          }}
                        >
                          {
                            booking.paymentType
                          }
                        </div>
                      </div>

                      <div
                        style={{
                          textAlign:
                            "right",
                        }}
                      >
                        <strong>
                          Paid{" "}
                          {fmtINR(
                            booking.paidAmount
                          )}
                        </strong>

                        {Number(
                          booking.remainingAmount ||
                            0
                        ) > 0 && (
                          <div
                            style={{
                              color:
                                C.red,
                              fontSize: 11,
                              marginTop: 3,
                            }}
                          >
                            Remaining{" "}
                            {fmtINR(
                              booking.remainingAmount
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>
        )}
      </main>

      {bookingCar && (
        <BookingModal
          car={bookingCar}
          onClose={() =>
            setBookingCar(null)
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
   STAT CARD
   ========================================================= */

function StatCard({
  icon,
  label,
  value,
}) {
  return (
    <div
      style={{
        background: C.white,
        border:
          `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 18,
        display: "flex",
        alignItems:
          "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 13,
          background:
            "#fff7ed",
          color: C.orange,
          display: "grid",
          placeItems: "center",
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            color: C.gray,
            fontWeight: 700,
          }}
        >
          {label}
        </div>

        <div
          style={{
            marginTop: 3,
            fontSize: 24,
            fontWeight: 900,
            color: C.dark,
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
  bookings,
  cities,
  setCities,
}) {
  const [showAdd, setShowAdd] =
    useState(false);

  const [form, setForm] =
    useState({
      name: "",
      city:
        cities[0] ||
        "Bhopal",
      type: "Hatchback",
      price: "",
      fuel: "Petrol",
      transmission:
        "Manual",
      seats: 5,
      image: "",
    });

  const [newCity, setNewCity] =
    useState("");

  const [photoLoading, setPhotoLoading] =
    useState(false);

  const [photoBusyId, setPhotoBusyId] =
    useState(null);

  const newPhotoInputRef =
    useRef(null);

  useEffect(() => {
    if (
      !form.city &&
      cities.length > 0
    ) {
      setForm((prev) => ({
        ...prev,
        city: cities[0],
      }));
    }
  }, [cities]);

  function updateForm(e) {
    const {
      name,
      value,
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleNewVehiclePhoto(
    e
  ) {
    const file =
      e.target.files?.[0];

    if (!file) return;

    setPhotoLoading(true);

    try {
      const compressed =
        await compressImage(
          file
        );

      setForm((prev) => ({
        ...prev,
        image: compressed,
      }));
    } catch (error) {
      alert(
        error.message ||
          "Unable to process the selected image."
      );
    } finally {
      setPhotoLoading(false);

      e.target.value = "";
    }
  }

  async function handleExistingVehiclePhoto(
    carId,
    e
  ) {
    const file =
      e.target.files?.[0];

    if (!file) return;

    setPhotoBusyId(carId);

    try {
      const compressed =
        await compressImage(
          file
        );

      setCars((prev) =>
        prev.map((car) =>
          car.id === carId
            ? {
                ...car,
                image:
                  compressed,
              }
            : car
        )
      );
    } catch (error) {
      alert(
        error.message ||
          "Unable to process the selected image."
      );
    } finally {
      setPhotoBusyId(null);

      e.target.value = "";
    }
  }

  function removeVehiclePhoto(
    carId
  ) {
    const confirmed =
      window.confirm(
        "Remove this vehicle photo?"
      );

    if (!confirmed) return;

    setCars((prev) =>
      prev.map((car) =>
        car.id === carId
          ? {
              ...car,
              image: "",
            }
          : car
      )
    );
  }

  function addVehicle(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert(
        "Please enter vehicle name."
      );

      return;
    }

    if (!form.city.trim()) {
      alert(
        "Please select vehicle city."
      );

      return;
    }

    if (
      Number(form.price) <= 0
    ) {
      alert(
        "Please enter a valid daily price."
      );

      return;
    }

    const vehicle = {
      ...form,

      id: uid("car"),

      price: Number(
        form.price
      ),

      seats: Number(
        form.seats
      ),

      status: "available",

      image:
        form.image || "",
    };

    setCars((prev) => [
      ...prev,
      vehicle,
    ]);

    setForm({
      name: "",
      city:
        cities[0] ||
        "Bhopal",
      type: "Hatchback",
      price: "",
      fuel: "Petrol",
      transmission:
        "Manual",
      seats: 5,
      image: "",
    });

    setShowAdd(false);
  }

  function toggleStatus(
    carId
  ) {
    setCars((prev) =>
      prev.map((car) =>
        car.id === carId
          ? {
              ...car,
              status:
                car.status ===
                "available"
                  ? "rented"
                  : "available",
            }
          : car
      )
    );
  }

  function removeCar(
    carId
  ) {
    const car =
      cars.find(
        (item) =>
          item.id === carId
      );

    if (!car) return;

    const confirmed =
      window.confirm(
        `Delete ${car.name}? This cannot be undone.`
      );

    if (!confirmed) return;

    setCars((prev) =>
      prev.filter(
        (item) =>
          item.id !== carId
      )
    );
  }

  function addCity() {
    const clean =
      newCity.trim();

    if (!clean) return;

    const exists =
      cities.some(
        (city) =>
          city.toLowerCase() ===
          clean.toLowerCase()
      );

    if (exists) {
      alert(
        "This city already exists."
      );

      return;
    }

    setCities((prev) => [
      ...prev,
      clean,
    ]);

    setNewCity("");
  }

  function removeCity(
    city
  ) {
    if (cities.length <= 1) {
      alert(
        "You must keep at least one city."
      );

      return;
    }

    const used =
      cars.some(
        (car) =>
          car.city === city
      );

    if (used) {
      alert(
        "This city is currently used by a vehicle. Change the vehicle city before removing this city."
      );

      return;
    }

    setCities((prev) =>
      prev.filter(
        (item) =>
          item !== city
      )
    );
  }

  const available =
    cars.filter(
      (car) =>
        car.status ===
        "available"
    ).length;

  const rented =
    cars.filter(
      (car) =>
        car.status ===
        "rented"
    ).length;

  const revenue =
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.light,
      }}
    >
      {/* ADMIN HEADER */}

      <div
        style={{
          background: C.dark,
          color: C.white,
          padding: 20,
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color:
                  "#fdba74",
                fontWeight: 900,
                letterSpacing: 1,
              }}
            >
              SAWARIYA RENTALS
            </div>

            <h1
              style={{
                margin:
                  "4px 0 0",
                fontSize: 25,
              }}
            >
              Admin Dashboard
            </h1>
          </div>

          <Badge tone="green">
            <ShieldCheck
              size={14}
            />
            Admin access
          </Badge>
        </div>
      </div>

      <main
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding:
            "24px 20px 60px",
        }}
      >
        {/* STATS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(200px,1fr))",
            gap: 14,
          }}
        >
          <StatCard
            icon={
              <Car size={20} />
            }
            label="Total Vehicles"
            value={
              cars.length
            }
          />

          <StatCard
            icon={
              <CheckCircle2
                size={20}
              />
            }
            label="Available"
            value={
              available
            }
          />

          <StatCard
            icon={
              <Power size={20} />
            }
            label="Rented"
            value={rented}
          />

          <StatCard
            icon={
              <IndianRupee
                size={20}
              />
            }
            label="Money Collected"
            value={fmtINR(
              revenue
            )}
          />
        </div>

        {/* FLEET */}

        <section
          style={{
            marginTop: 24,
            background:
              C.white,
            border:
              `1px solid ${C.border}`,
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 18,
              borderBottom:
                `1px solid ${C.border}`,
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: 12,
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  color: C.dark,
                }}
              >
                Vehicle Fleet
              </h2>

              <p
                style={{
                  margin:
                    "4px 0 0",
                  color: C.gray,
                  fontSize: 13,
                }}
              >
                Add vehicles and
                manage their
                photos and
                availability.
              </p>
            </div>

            <button
              onClick={() =>
                setShowAdd(
                  (prev) =>
                    !prev
                )
              }
              style={
                primaryButton
              }
            >
              <Plus size={17} />
              Add Vehicle
            </button>
          </div>

          {/* ADD VEHICLE FORM */}

          {showAdd && (
            <form
              onSubmit={
                addVehicle
              }
              style={{
                padding: 20,
                background:
                  "#fffaf5",
                borderBottom:
                  `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(200px,1fr))",
                  gap: 14,
                }}
              >
                <label>
                  <div
                    style={
                      labelStyle
                    }
                  >
                    Vehicle Name
                  </div>

                  <input
                    name="name"
                    value={
                      form.name
                    }
                    onChange={
                      updateForm
                    }
                    placeholder="e.g. Kia Seltos"
                    style={
                      inputStyle
                    }
                  />
                </label>

                <label>
                  <div
                    style={
                      labelStyle
                    }
                  >
                    City
                  </div>

                  <select
                    name="city"
                    value={
                      form.city
                    }
                    onChange={
                      updateForm
                    }
                    style={
                      inputStyle
                    }
                  >
                    {cities.map(
                      (city) => (
                        <option
                          key={
                            city
                          }
                          value={
                            city
                          }
                        >
                          {city}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  <div
                    style={
                      labelStyle
                    }
                  >
                    Vehicle Type
                  </div>

                  <select
                    name="type"
                    value={
                      form.type
                    }
                    onChange={
                      updateForm
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
                      MPV
                    </option>
                    <option>
                      Luxury
                    </option>
                  </select>
                </label>

                <label>
                  <div
                    style={
                      labelStyle
                    }
                  >
                    Price / Day
                  </div>

                  <input
                    name="price"
                    value={
                      form.price
                    }
                    onChange={
                      updateForm
                    }
                    type="number"
                    min="1"
                    placeholder="1499"
                    style={
                      inputStyle
                    }
                  />
                </label>

                <label>
                  <div
                    style={
                      labelStyle
                    }
                  >
                    Fuel
                  </div>

                  <select
                    name="fuel"
                    value={
                      form.fuel
                    }
                    onChange={
                      updateForm
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
                    <option>
                      Hybrid
                    </option>
                  </select>
                </label>

                <label>
                  <div
                    style={
                      labelStyle
                    }
                  >
                    Transmission
                  </div>

                  <select
                    name="transmission"
                    value={
                      form.transmission
                    }
                    onChange={
                      updateForm
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
                </label>

                <label>
                  <div
                    style={
                      labelStyle
                    }
                  >
                    Seats
                  </div>

                  <input
                    name="seats"
                    value={
                      form.seats
                    }
                    onChange={
                      updateForm
                    }
                    type="number"
                    min="2"
                    max="12"
                    style={
                      inputStyle
                    }
                  />
                </label>
              </div>

              {/* PHOTO */}

              <div
                style={{
                  marginTop: 18,
                  padding: 16,
                  borderRadius: 16,
                  border:
                    `1px dashed ${C.orange}`,
                  background:
                    C.white,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 8,
                    marginBottom:
                      10,
                    color: C.dark,
                    fontWeight: 900,
                  }}
                >
                  <Camera
                    size={18}
                    color={
                      C.orange
                    }
                  />
                  Vehicle Photo
                </div>

                <input
                  ref={
                    newPhotoInputRef
                  }
                  type="file"
                  accept="image/*"
                  onChange={
                    handleNewVehiclePhoto
                  }
                  style={{
                    display:
                      "none",
                  }}
                />

                {!form.image ? (
                  <button
                    type="button"
                    onClick={() =>
                      newPhotoInputRef.current?.click()
                    }
                    disabled={
                      photoLoading
                    }
                    style={{
                      border:
                        `1px solid ${C.orange}`,
                      background:
                        "#fff7ed",
                      color:
                        C.orangeDark,
                      borderRadius: 12,
                      padding:
                        "12px 16px",
                      fontWeight: 900,
                      cursor:
                        photoLoading
                          ? "wait"
                          : "pointer",
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      gap: 8,
                    }}
                  >
                    <Upload
                      size={17}
                    />

                    {photoLoading
                      ? "Processing..."
                      : "Add Vehicle Photo"}
                  </button>
                ) : (
                  <div
                    style={{
                      display:
                        "flex",
                      gap: 14,
                      alignItems:
                        "center",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <img
                      src={
                        form.image
                      }
                      alt="Vehicle preview"
                      style={{
                        width: 180,
                        height: 110,
                        objectFit:
                          "cover",
                        borderRadius:
                          13,
                        border:
                          `1px solid ${C.border}`,
                      }}
                    />

                    <div
                      style={{
                        display:
                          "flex",
                        gap: 8,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          newPhotoInputRef.current?.click()
                        }
                        style={
                          secondaryButton
                        }
                      >
                        <Pencil
                          size={15}
                        />
                        Change Photo
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setForm(
                            (
                              prev
                            ) => ({
                              ...prev,
                              image:
                                "",
                            })
                          )
                        }
                        style={
                          dangerButton
                        }
                      >
                        <Trash2
                          size={15}
                        />
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    marginTop: 9,
                    color: C.gray,
                    fontSize: 12,
                  }}
                >
                  Photos are
                  automatically
                  resized and
                  compressed for
                  storage.
                </div>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap: 10,
                  marginTop: 18,
                  flexWrap:
                    "wrap",
                }}
              >
                <button
                  type="submit"
                  style={
                    primaryButton
                  }
                >
                  <Plus size={17} />
                  Add Vehicle
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowAdd(
                      false
                    )
                  }
                  style={
                    secondaryButton
                  }
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* VEHICLE LIST */}

          <div
            style={{
              padding: 18,
            }}
          >
            <div
              style={{
                display:
                  "grid",
                gap: 12,
              }}
            >
              {cars.map(
                (car) => (
                  <div
                    key={
                      car.id
                    }
                    style={{
                      border:
                        `1px solid ${C.border}`,
                      borderRadius: 16,
                      padding: 12,
                      display:
                        "grid",
                      gridTemplateColumns:
                        "90px minmax(160px,1fr) auto",
                      gap: 14,
                      alignItems:
                        "center",
                    }}
                  >
                    {/* IMAGE */}

                    <div
                      style={{
                        width: 90,
                        height: 70,
                        borderRadius: 12,
                        overflow:
                          "hidden",
                        background:
                          "#f1f5f9",
                        display:
                          "grid",
                        placeItems:
                          "center",
                      }}
                    >
                      {car.image ? (
                        <img
                          src={
                            car.image
                          }
                          alt={
                            car.name
                          }
                          style={{
                            width:
                              "100%",
                            height:
                              "100%",
                            objectFit:
                              "cover",
                          }}
                        />
                      ) : (
                        <ImageIcon
                          size={
                            27
                          }
                          color={
                            "#94a3b8"
                          }
                        />
                      )}
                    </div>

                    {/* INFO */}

                    <div>
                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: 8,
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <strong
                          style={{
                            fontSize:
                              16,
                            color:
                              C.dark,
                          }}
                        >
                          {
                            car.name
                          }
                        </strong>

                        <Badge
                          tone={
                            car.status ===
                            "available"
                              ? "green"
                              : "red"
                          }
                        >
                          {
                            car.status
                          }
                        </Badge>
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          color:
                            C.gray,
                          fontSize:
                            12,
                        }}
                      >
                        {
                          car.city
                        }{" "}
                        ·{" "}
                        {
                          car.type
                        }{" "}
                        ·{" "}
                        {
                          car.seats
                        }{" "}
                        seats
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          fontWeight:
                            900,
                          color:
                            C.orangeDark,
                        }}
                      >
                        {fmtINR(
                          car.price
                        )}{" "}
                        / day
                      </div>
                    </div>

                    {/* ACTIONS */}

                    <div
                      style={{
                        display:
                          "flex",
                        gap: 7,
                        flexWrap:
                          "wrap",
                        justifyContent:
                          "flex-end",
                      }}
                    >
                      <input
                        id={`photo-${car.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(
                          e
                        ) =>
                          handleExistingVehiclePhoto(
                            car.id,
                            e
                          )
                        }
                        style={{
                          display:
                            "none",
                        }}
                      />

                      <label
                        htmlFor={`photo-${car.id}`}
                        style={{
                          ...smallButton,
                          background:
                            "#fff7ed",
                          color:
                            C.orangeDark,
                          border:
                            "1px solid #fed7aa",
                          cursor:
                            photoBusyId ===
                            car.id
                              ? "wait"
                              : "pointer",
                        }}
                      >
                        <Camera
                          size={
                            14
                          }
                        />

                        {photoBusyId ===
                        car.id
                          ? "Processing..."
                          : car.image
                          ? "Change Photo"
                          : "Add Photo"}
                      </label>

                      {car.image && (
                        <button
                          type="button"
                          onClick={() =>
                            removeVehiclePhoto(
                              car.id
                            )
                          }
                          style={{
                            ...smallButton,
                            background:
                              "#fff1f2",
                            color:
                              C.red,
                            border:
                              "1px solid #fecdd3",
                          }}
                        >
                          <Trash2
                            size={
                              14
                            }
                          />
                          Photo
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          toggleStatus(
                            car.id
                          )
                        }
                        style={{
                          ...smallButton,
                          background:
                            car.status ===
                            "available"
                              ? "#fefce8"
                              : "#ecfdf5",
                          color:
                            car.status ===
                            "available"
                              ? "#854d0e"
                              : "#166534",
                          border:
                            `1px solid ${
                              car.status ===
                              "available"
                                ? "#fde68a"
                                : "#bbf7d0"
                            }`,
                        }}
                      >
                        <Power
                          size={
                            14
                          }
                        />

                        {car.status ===
                        "available"
                          ? "Mark Rented"
                          : "Available"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeCar(
                            car.id
                          )
                        }
                        style={{
                          ...smallButton,
                          background:
                            "#fff1f2",
                          color:
                            C.red,
                          border:
                            "1px solid #fecdd3",
                        }}
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
          </div>
        </section>

        {/* CITIES */}

        <section
          style={{
            marginTop: 24,
            background:
              C.white,
            border:
              `1px solid ${C.border}`,
            borderRadius: 18,
            padding: 18,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              color: C.dark,
            }}
          >
            Manage Cities
          </h2>

          <div
            style={{
              display:
                "flex",
              gap: 8,
              marginTop: 14,
              flexWrap:
                "wrap",
            }}
          >
            {cities.map(
              (city) => (
                <div
                  key={city}
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap: 7,
                    padding:
                      "8px 10px",
                    borderRadius:
                      999,
                    background:
                      "#f8fafc",
                    border:
                      `1px solid ${C.border}`,
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {city}

                  <button
                    type="button"
                    onClick={() =>
                      removeCity(
                        city
                      )
                    }
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius:
                        "50%",
                      border: 0,
                      background:
                        "#fee2e2",
                      color:
                        C.red,
                      cursor:
                        "pointer",
                      display:
                        "grid",
                      placeItems:
                        "center",
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

          <div
            style={{
              display:
                "flex",
              gap: 8,
              marginTop: 15,
              maxWidth: 450,
            }}
          >
            <input
              value={newCity}
              onChange={(e) =>
                setNewCity(
                  e.target.value
                )
              }
              placeholder="Add new city"
              style={{
                ...inputStyle,
                flex: 1,
              }}
              onKeyDown={(e) => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  e.preventDefault();
                  addCity();
                }
              }}
            />

            <button
              type="button"
              onClick={
                addCity
              }
              style={
                secondaryButton
              }
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </section>

        {/* BOOKINGS */}

        <section
          style={{
            marginTop: 24,
            background:
              C.white,
            border:
              `1px solid ${C.border}`,
            borderRadius: 18,
            padding: 18,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              color: C.dark,
            }}
          >
            Booking Records
          </h2>

          {bookings.length ===
          0 ? (
            <div
              style={{
                padding: 30,
                textAlign:
                  "center",
                color: C.gray,
              }}
            >
              No bookings yet.
            </div>
          ) : (
            <div
              style={{
                marginTop: 14,
                display:
                  "grid",
                gap: 10,
              }}
            >
              {[...bookings]
                .reverse()
                .map(
                  (booking) => (
                    <div
                      key={
                        booking.id
                      }
                      style={{
                        border:
                          `1px solid ${C.border}`,
                        borderRadius: 13,
                        padding: 13,
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        flexWrap:
                          "wrap",
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
                            marginTop: 4,
                          }}
                        >
                          {
                            booking.customerName
                          }{" "}
                          ·{" "}
                          {
                            booking.phone
                          }
                        </div>

                        <div
                          style={{
                            color:
                              C.gray,
                            fontSize:
                              12,
                            marginTop: 3,
                          }}
                        >
                          {
                            booking.startDate
                          }{" "}
                          →{" "}
                          {
                            booking.endDate
                          }
                        </div>
                      </div>

                      <div
                        style={{
                          textAlign:
                            "right",
                          minWidth:
                            170,
                        }}
                      >
                        <strong
                          style={{
                            color:
                              C.orangeDark,
                            fontSize:
                              16,
                          }}
                        >
                          Paid:{" "}
                          {fmtINR(
                            booking.paidAmount
                          )}
                        </strong>

                        <div
                          style={{
                            color:
                              C.gray,
                            fontSize:
                              12,
                            marginTop: 4,
                          }}
                        >
                          Total:{" "}
                          {fmtINR(
                            booking.total
                          )}
                        </div>

                        <div
                          style={{
                            marginTop: 5,
                            fontSize:
                              12,
                            fontWeight:
                              800,
                            color:
                              Number(
                                booking.remainingAmount ||
                                  0
                              ) > 0
                                ? C.red
                                : C.green,
                          }}
                        >
                          {Number(
                            booking.remainingAmount ||
                              0
                          ) > 0
                            ? `Remaining: ${fmtINR(
                                booking.remainingAmount
                              )}`
                            : "Fully Paid"}
                        </div>

                        <div
                          style={{
                            marginTop: 5,
                            fontSize:
                              11,
                            color:
                              C.gray,
                          }}
                        >
                          {
                            booking.paymentType
                          }
                        </div>

                        <div
                          style={{
                            marginTop: 5,
                            fontSize:
                              10,
                            color:
                              C.gray,
                            wordBreak:
                              "break-all",
                          }}
                        >
                          {booking.paymentId
                            ? `Payment: ${booking.paymentId}`
                            : "Payment recorded"}
                        </div>
                      </div>
                    </div>
                  )
                )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* =========================================================
   ADMIN GATE
   ========================================================= */

function AdminGate({
  onSuccess,
  onCancel,
}) {
  const [passcode, setPasscode] =
    useState("");

  const [error, setError] =
    useState("");

  function submit(e) {
    e.preventDefault();

    if (
      passcode ===
      ADMIN_PASSCODE
    ) {
      setError("");

      onSuccess();

      return;
    }

    setError(
      "Incorrect admin passcode."
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.light,
        display: "grid",
        placeItems:
          "center",
        padding: 20,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 430,
          background:
            C.white,
          border:
            `1px solid ${C.border}`,
          borderRadius: 22,
          padding: 28,
          boxShadow:
            "0 20px 60px rgba(15,23,42,.1)",
        }}
      >
        <div
          style={{
            width: 55,
            height: 55,
            borderRadius: 16,
            background:
              "#fff7ed",
            color: C.orange,
            display: "grid",
            placeItems:
              "center",
          }}
        >
          <Lock size={25} />
        </div>

        <h1
          style={{
            margin:
              "18px 0 6px",
            color: C.dark,
            fontSize: 27,
          }}
        >
          Admin Login
        </h1>

        <p
          style={{
            margin: 0,
            color: C.gray,
            lineHeight: 1.5,
          }}
        >
          Enter the admin
          passcode to manage
          your Sawariya Rentals
          fleet.
        </p>

        <label
          style={{
            display:
              "block",
            marginTop: 20,
          }}
        >
          <div
            style={labelStyle}
          >
            Admin Passcode
          </div>

          <input
            type="password"
            value={passcode}
            onChange={(e) =>
              setPasscode(
                e.target.value
              )
            }
            placeholder="Enter passcode"
            autoFocus
            style={inputStyle}
          />
        </label>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 11,
              background:
                "#fee2e2",
              color:
                "#991b1b",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          style={{
            ...primaryButton,
            width: "100%",
            justifyContent:
              "center",
            marginTop: 17,
          }}
        >
          <Lock size={16} />
          Login
        </button>

        <button
          type="button"
          onClick={
            onCancel
          }
          style={{
            width: "100%",
            marginTop: 9,
            padding: 12,
            borderRadius: 12,
            border:
              `1px solid ${C.border}`,
            background:
              C.white,
            color: C.dark,
            fontWeight: 800,
            cursor:
              "pointer",
          }}
        >
          Back to Rentals
        </button>
      </form>
    </div>
  );
}

/* =========================================================
   APP
   ========================================================= */

function App() {
  const [cars, setCars] =
    useState(seedCars);

  const [cities, setCities] =
    useState(seedCities);

  const [bookings, setBookings] =
    useState([]);

  const [view, setView] =
    useState("customer");

  const [gate, setGate] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  /*
    This function is exposed temporarily
    so CustomerView can send a verified
    booking back to App.
  */

  function confirmBooking(data) {
    const booking = {
      id: uid("booking"),

      carId:
        data.car.id,

      carName:
        data.car.name,

      customerName:
        data.customer.name,

      phone:
        data.customer.phone,

      email:
        data.customer.email,

      startDate:
        data.startDate,

      endDate:
        data.endDate,

      days:
        data.days,

      /*
        Complete rental amount
      */
      total:
        Number(
          data.total || 0
        ),

      /*
        Actual money received
      */
      paidAmount:
        Number(
          data.paidAmount || 0
        ),

      /*
        Payment type
      */
      paymentType:
        data.paymentType ||
        "Booking Advance",

      /*
        Advance paid
      */
      advancePaid:
        Number(
          data.advancePaid ||
            data.paidAmount ||
            0
        ),

      /*
        Amount still to collect
      */
      remainingAmount:
        Number(
          data.remainingAmount ||
            0
        ),

      paymentId:
        data.paymentId ||
        "",

      orderId:
        data.orderId ||
        "",

      signature:
        data.signature ||
        "",

      createdAt:
        new Date().toISOString(),
    };

    setBookings(
      (prev) => [
        ...prev,
        booking,
      ]
    );

    /*
      Mark the car rented after
      successful payment verification.
    */

    setCars((prev) =>
      prev.map((car) =>
        car.id ===
        data.car.id
          ? {
              ...car,
              status:
                "rented",
            }
          : car
      )
    );

    if (
      data.paymentType ===
      "Full Payment"
    ) {
      alert(
        `Booking confirmed successfully!\n\nFull payment received: ${fmtINR(
          data.paidAmount
        )}\nRemaining: ₹0`
      );
    } else {
      alert(
        `Booking confirmed successfully!\n\nBooking advance received: ${fmtINR(
          data.paidAmount
        )}\nRemaining amount: ${fmtINR(
          data.remainingAmount
        )}`
      );
    }
  }

  /*
    Make booking callback available
    to CustomerView.
  */

  useEffect(() => {
    window.__SAWARIYA_CONFIRM_BOOKING__ =
      confirmBooking;

    return () => {
      delete window.__SAWARIYA_CONFIRM_BOOKING__;
    };
  }, [
    cars,
    cities,
    bookings,
  ]);

  /* LOAD DATA */

  useEffect(() => {
    async function loadData() {
      const [
        storedCars,
        storedCities,
        storedBookings,
      ] =
        await Promise.all([
          loadShared(
            "sawariya_cars",
            seedCars
          ),

          loadShared(
            "sawariya_cities",
            seedCities
          ),

          loadShared(
            "sawariya_bookings",
            []
          ),
        ]);

      setCars(
        Array.isArray(
          storedCars
        )
          ? storedCars
          : seedCars
      );

      setCities(
        Array.isArray(
          storedCities
        )
          ? storedCities
          : seedCities
      );

      setBookings(
        Array.isArray(
          storedBookings
        )
          ? storedBookings
          : []
      );

      setLoading(false);
    }

    loadData();
  }, []);

  /* SAVE CARS */

  useEffect(() => {
    if (!loading) {
      saveShared(
        "sawariya_cars",
        cars
      );
    }
  }, [
    cars,
    loading,
  ]);

  /* SAVE CITIES */

  useEffect(() => {
    if (!loading) {
      saveShared(
        "sawariya_cities",
        cities
      );
    }
  }, [
    cities,
    loading,
  ]);

  /* SAVE BOOKINGS */

  useEffect(() => {
    if (!loading) {
      saveShared(
        "sawariya_bookings",
        bookings
      );
    }
  }, [
    bookings,
    loading,
  ]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems:
            "center",
          background: C.light,
          color: C.dark,
          fontWeight: 800,
        }}
      >
        Loading SAWARIYA
        RENTALS...
      </div>
    );
  }

  return (
    <div>
      {/* TOP NAVIGATION */}

      <div
        style={{
          position:
            "fixed",
          zIndex: 900,
          top: 14,
          left: 14,
          right: 14,
          pointerEvents:
            "none",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display:
              "flex",
            justifyContent:
              "flex-end",
            pointerEvents:
              "auto",
          }}
        >
          {view ===
            "customer" && (
            <button
              onClick={() => {
                setView(
                  "admin"
                );

                setGate(true);
              }}
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 7,
                padding:
                  "9px 12px",
                border:
                  "1px solid rgba(255,255,255,.2)",
                background:
                  "rgba(17,24,39,.82)",
                color:
                  C.white,
                fontWeight: 800,
                cursor:
                  "pointer",
                backdropFilter:
                  "blur(10px)",
              }}
            >
              <Lock
                size={14}
              />
              Admin
            </button>
          )}

          {view ===
            "admin" &&
            !gate && (
              <button
                onClick={() => {
                  setGate(
                    false
                  );

                  setView(
                    "customer"
                  );
                }}
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: 7,
                  padding:
                    "9px 12px",
                  border:
                    "1px solid rgba(255,255,255,.2)",
                  background:
                    "rgba(17,24,39,.82)",
                  color:
                    C.white,
                  fontWeight: 800,
                  cursor:
                    "pointer",
                  backdropFilter:
                    "blur(10px)",
                }}
              >
                <LogOut
                  size={14}
                />
                Rentals
              </button>
            )}
        </div>
      </div>

      {/* CUSTOMER */}

      {view ===
        "customer" && (
        <CustomerView
          cars={cars}
          cities={cities}
          bookings={
            bookings
          }
        />
      )}

      {/* ADMIN LOGIN */}

      {view ===
        "admin" &&
        gate && (
          <AdminGate
            onSuccess={() =>
              setGate(
                false
              )
            }
            onCancel={() => {
              setGate(
                false
              );

              setView(
                "customer"
              );
            }}
          />
        )}

      {/* ADMIN */}

      {view ===
        "admin" &&
        !gate && (
          <AdminView
            cars={cars}
            setCars={
              setCars
            }
            bookings={
              bookings
            }
            cities={
              cities
            }
            setCities={
              setCities
            }
          />
        )}
    </div>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const labelStyle = {
  fontSize: 12,
  fontWeight: 800,
  color: C.dark2,
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  borderRadius: 11,
  border:
    `1px solid ${C.border}`,
  background: C.white,
  color: C.dark,
  outline: "none",
  fontSize: 14,
};

const primaryButton = {
  display:
    "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap: 7,
  border: 0,
  borderRadius: 11,
  padding:
    "11px 15px",
  background:
    C.orange,
  color: C.white,
  fontWeight: 900,
  cursor:
    "pointer",
};

const secondaryButton = {
  display:
    "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap: 7,
  border:
    `1px solid ${C.border}`,
  borderRadius: 11,
  padding:
    "10px 13px",
  background:
    C.white,
  color: C.dark,
  fontWeight: 800,
  cursor:
    "pointer",
};

const dangerButton = {
  display:
    "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap: 7,
  border:
    "1px solid #fecdd3",
  borderRadius: 11,
  padding:
    "10px 13px",
  background:
    "#fff1f2",
  color: C.red,
  fontWeight: 800,
  cursor:
    "pointer",
};

const smallButton = {
  display:
    "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap: 5,
  borderRadius: 9,
  padding:
    "8px 10px",
  fontSize: 11,
  fontWeight: 800,
  cursor:
    "pointer",
};

/* =========================================================
   EXPORT
   ========================================================= */

export default App;
