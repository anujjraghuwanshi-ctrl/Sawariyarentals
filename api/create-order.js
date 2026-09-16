export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const {
      amount,
      receipt,
      carId,
      carName,
      name,
      phone,
    } = req.body || {};

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay keys are missing");

      return res.status(500).json({
        success: false,
        message:
          "Razorpay keys are not configured on the server.",
      });
    }

    const auth = Buffer.from(
      `${keyId}:${keySecret}`
    ).toString("base64");

    const amountInPaise = Math.round(
      numericAmount * 100
    );

    const response = await fetch(
      "https://api.razorpay.com/v1/orders",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt:
            receipt || `sawariya_${Date.now()}`,
          notes: {
            carId: String(carId || ""),
            carName: String(carName || ""),
            customerName: String(name || ""),
            customerPhone: String(phone || ""),
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Razorpay order creation failed:",
        data
      );

      return res.status(response.status).json({
        success: false,
        message:
          data?.error?.description ||
          "Failed to create Razorpay order",
      });
    }

    return res.status(200).json({
      success: true,

      // IMPORTANT:
      // App.jsx expects "id"
      id: data.id,

      // Keep orderId too for compatibility
      orderId: data.id,

      amount: data.amount,
      currency: data.currency,
      key: keyId,
    });
  } catch (error) {
    console.error(
      "Create order server error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Server error while creating payment order",
    });
  }
}
