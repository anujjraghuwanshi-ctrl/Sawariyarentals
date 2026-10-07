import crypto from "crypto";

const SITE_URL = "https://sawariyarental.in";

function sha512(value) {
  return crypto
    .createHash("sha512")
    .update(value, "utf8")
    .digest("hex");
}

function getPaymentUrl() {
  const base = String(process.env.PAYU_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");

  if (!base) {
    throw new Error("PAYU_BASE_URL is not configured.");
  }

  return base.endsWith("/_payment")
    ? base
    : `${base}/_payment`;
}

function cleanText(value, max = 255) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const key = process.env.PAYU_KEY;
    const salt = process.env.PAYU_SALT;

    if (!key || !salt) {
      return res.status(500).json({
        success: false,
        message: "PayU credentials are not configured.",
      });
    }

    const {
      amount,
      productinfo,
      firstname,
      email,
      phone,
      reference,
    } = req.body || {};

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount.",
      });
    }

    const customerName = cleanText(firstname, 60);
    const customerEmail = cleanText(email, 120).toLowerCase();
    const customerPhone = cleanText(phone, 15);

    if (!customerName) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required.",
      });
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        customerEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required.",
      });
    }

    const phoneDigits =
      customerPhone.replace(/\D/g, "");

    if (!/^\d{10}$/.test(phoneDigits)) {
      return res.status(400).json({
        success: false,
        message: "Valid 10-digit phone is required.",
      });
    }

    const formattedAmount =
      numericAmount.toFixed(2);

    const txnid =
      `SR${Date.now()}${crypto
        .randomBytes(4)
        .toString("hex")}`;

    const params = {
      key,
      txnid,
      amount: formattedAmount,
      productinfo: cleanText(
        productinfo ||
          "Sawariya Rentals Booking",
        100
      ),
      firstname: customerName,
      email: customerEmail,
      phone: phoneDigits,

      surl:
        `${SITE_URL}/api/payu-callback`,

      furl:
        `${SITE_URL}/api/payu-callback`,

      udf1: cleanText(reference, 100),
      udf2: "",
      udf3: "",
      udf4: "",
      udf5: "",
    };

    const hashString =
      `${params.key}|` +
      `${params.txnid}|` +
      `${params.amount}|` +
      `${params.productinfo}|` +
      `${params.firstname}|` +
      `${params.email}|` +
      `${params.udf1}|` +
      `${params.udf2}|` +
      `${params.udf3}|` +
      `${params.udf4}|` +
      `${params.udf5}||||||` +
      `${salt}`;

    params.hash =
      sha512(hashString).toLowerCase();

    return res.status(200).json({
      success: true,
      txnid: params.txnid,
      paymentUrl: getPaymentUrl(),
      formData: params,
    });
  } catch (error) {
    console.error(
      "PayU create payment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Unable to create PayU payment.",
    });
  }
}
