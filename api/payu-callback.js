import crypto from "crypto";

const SITE_URL = "https://sawariyarental.in";

function sha512(value) {
  return crypto
    .createHash("sha512")
    .update(value, "utf8")
    .digest("hex")
    .toLowerCase();
}

function parseBody(req) {
  if (!req.body) return {};

  if (
    typeof req.body === "object" &&
    !Buffer.isBuffer(req.body)
  ) {
    return req.body;
  }

  const raw = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : String(req.body);

  return Object.fromEntries(
    new URLSearchParams(raw)
  );
}

function safeEqual(a, b) {
  const left = Buffer.from(
    String(a || "").toLowerCase(),
    "utf8"
  );

  const right = Buffer.from(
    String(b || "").toLowerCase(),
    "utf8"
  );

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    left,
    right
  );
}

function getReverseHash(data, salt) {
  const {
    additional_charges,
    status = "",
    udf5 = "",
    udf4 = "",
    udf3 = "",
    udf2 = "",
    udf1 = "",
    email = "",
    firstname = "",
    productinfo = "",
    amount = "",
    txnid = "",
    key = "",
  } = data;

  if (additional_charges) {
    return sha512(
      `${additional_charges}|${salt}|${status}||||||` +
      `${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|` +
      `${email}|${firstname}|${productinfo}|` +
      `${amount}|${txnid}|${key}`
    );
  }

  return sha512(
    `${salt}|${status}||||||` +
    `${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|` +
    `${email}|${firstname}|${productinfo}|` +
    `${amount}|${txnid}|${key}`
  );
}

function redirectToSite(res, status, data) {
  const url = new URL(SITE_URL);

  url.searchParams.set(
    "payu",
    status
  );

  if (data.txnid) {
    url.searchParams.set(
      "txnid",
      String(data.txnid)
    );
  }

  if (data.mihpayid) {
    url.searchParams.set(
      "mihpayid",
      String(data.mihpayid)
    );
  }

  if (data.message) {
    url.searchParams.set(
      "message",
      String(data.message)
    );
  }

  return res.redirect(
    303,
    url.toString()
  );
}

export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .send("Method not allowed");
  }

  try {
    const salt =
      process.env.PAYU_SALT;

    const merchantKey =
      process.env.PAYU_KEY;

    if (!salt || !merchantKey) {
      return res
        .status(500)
        .send(
          "PayU credentials are not configured."
        );
    }

    const data = parseBody(req);

    if (
      !data.txnid ||
      !data.amount ||
      !data.status ||
      !data.hash
    ) {
      return res
        .status(400)
        .send(
          "Invalid PayU callback."
        );
    }

    if (
      String(data.key) !==
      String(merchantKey)
    ) {
      return res
        .status(400)
        .send(
          "Invalid PayU merchant key."
        );
    }

    const expectedHash =
      getReverseHash(
        data,
        salt
      );

    if (
      !safeEqual(
        expectedHash,
        data.hash
      )
    ) {
      console.error(
        "PayU reverse hash validation failed"
      );

      return res
        .status(400)
        .send(
          "Invalid PayU response hash."
        );
    }

    const status =
      String(data.status)
        .toLowerCase();

    if (status === "success") {
      return redirectToSite(
        res,
        "success",
        {
          txnid: data.txnid,
          mihpayid:
            data.mihpayid,
        }
      );
    }

    return redirectToSite(
      res,
      "failure",
      {
        txnid: data.txnid,
        mihpayid:
          data.mihpayid,
        message:
          data.error_Message ||
          data.error ||
          "Payment failed.",
      }
    );
  } catch (error) {
    console.error(
      "PayU callback error:",
      error
    );

    return res
      .status(500)
      .send(
        "Unable to process PayU callback."
      );
  }
}
