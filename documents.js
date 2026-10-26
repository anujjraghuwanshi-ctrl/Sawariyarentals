// POST /api/documents
// Private storage for customers' Aadhaar and driving licence files.
//   action "upload"  (customers)  : saves one photo or PDF into a PRIVATE Supabase bucket
//   action "list"    (staff only) : returns short-lived links to the files for one booking
//   action "delete"  (staff only) : removes all files for one booking
// Staff actions need the secret code stored in the ADMIN_DOCS_CODE environment variable,
// which is checked here on the server (not in the browser).
import crypto from "node:crypto";

const BUCKET = "customer-documents";
const ID_RE = /^[A-Za-z0-9_.-]{6,80}$/;
const SLOT_RE = /^(aadhaar|licence)-[1-3]$/;
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_FILES_PER_BOOKING = 8;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let bucketReady = false;

async function defaultClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

function readBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === "string") {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  return b;
}

function sameSite(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return host === req.headers.host || host === req.headers["x-forwarded-host"];
  } catch {
    return false;
  }
}

// Decide the real file type from its first bytes (the browser's label can be faked).
export function sniff(buf) {
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (buf.length > 5 && buf.subarray(0, 5).toString("latin1") === "%PDF-") return { ext: "pdf", mime: "application/pdf" };
  if (buf.length > 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

function codeOk(given) {
  const expected = process.env.ADMIN_DOCS_CODE;
  const a = crypto.createHash("sha256").update(String(given || "")).digest();
  const b = crypto.createHash("sha256").update(String(expected || "")).digest();
  return crypto.timingSafeEqual(a, b);
}

async function ensureBucket(client) {
  if (bucketReady) return;
  const { data } = await client.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await client.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    });
    if (error && !/already exists/i.test(error.message || "")) throw error;
  }
  bucketReady = true;
}

export function makeHandler(getClient = defaultClient) {
  return async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ success: false, message: "Use POST." });
    if (!sameSite(req)) return res.status(403).json({ success: false, message: "Not allowed." });
    const body = readBody(req);
    const action = body.action;
    const bookingId = String(body.bookingId || "");
    if (!ID_RE.test(bookingId)) {
      return res.status(400).json({ success: false, message: "Booking reference is not valid." });
    }
    try {
      const client = await getClient();
      if (!client) {
        return res.status(503).json({ success: false, message: "Document upload is not switched on yet." });
      }
      await ensureBucket(client);
      const store = client.storage.from(BUCKET);

      if (action === "upload") {
        const slot = String(body.slot || "");
        if (!SLOT_RE.test(slot)) return res.status(400).json({ success: false, message: "Unknown document type." });
        const buf = Buffer.from(String(body.data || ""), "base64");
        if (!buf.length) return res.status(400).json({ success: false, message: "The file is empty." });
        if (buf.length > MAX_BYTES) return res.status(413).json({ success: false, message: "The file is larger than 3 MB." });
        const kind = sniff(buf);
        if (!kind) {
          return res.status(400).json({ success: false, message: "Only photos (JPG, PNG, WebP) and PDF files are allowed." });
        }
        const existing = await store.list(bookingId, { limit: 100 });
        if (((existing && existing.data) || []).length >= MAX_FILES_PER_BOOKING) {
          return res.status(400).json({ success: false, message: "This booking already has the maximum number of files." });
        }
        const path = `${bookingId}/${slot}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}.${kind.ext}`;
        const { error } = await store.upload(path, buf, { contentType: kind.mime, upsert: false });
        if (error) throw error;
        return res.status(200).json({ success: true, path });
      }

      if (action === "list" || action === "delete") {
        if (!process.env.ADMIN_DOCS_CODE) {
          return res.status(503).json({ success: false, message: "Viewing documents is not switched on yet." });
        }
        if (!codeOk(body.code)) {
          await sleep(400);
          return res.status(401).json({ success: false, message: "Wrong documents code." });
        }
        const { data, error } = await store.list(bookingId, { limit: 100 });
        if (error) throw error;
        const items = data || [];
        if (action === "delete") {
          if (items.length) {
            const { error: rmError } = await store.remove(items.map((f) => `${bookingId}/${f.name}`));
            if (rmError) throw rmError;
          }
          return res.status(200).json({ success: true, deleted: items.length });
        }
        const files = [];
        for (const f of items) {
          const signed = await store.createSignedUrl(`${bookingId}/${f.name}`, 600);
          if (signed && signed.data && signed.data.signedUrl) {
            const parts = f.name.split("-");
            files.push({
              name: f.name,
              slot: `${parts[0]}-${parts[1]}`,
              url: signed.data.signedUrl,
              size: (f.metadata && f.metadata.size) || 0,
              type: (f.metadata && f.metadata.mimetype) || (f.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
            });
          }
        }
        return res.status(200).json({ success: true, files });
      }

      return res.status(400).json({ success: false, message: "Unknown action." });
    } catch (error) {
      console.error("documents endpoint error", error);
      return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
    }
  };
}

export default makeHandler();
