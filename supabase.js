import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const BUCKET = "Cars";

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function fromRow(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    seats: row.seats,
    fuel: row.fuel,
    transmission: row.transmission,
    price8: Number(row.price_8h || 0),
    price12: Number(row.price_12h || 0),
    price24: Number(row.price_24h || 0),
    city: row.city,
    photos: row.photos || [],
    available: row.available !== false,
  };
}

function toRow(car) {
  const row = {
    name: car.name,
    type: car.type,
    seats: Number(car.seats || 0),
    fuel: car.fuel,
    transmission: car.transmission,
    price_8h: Number(car.price8 || 0),
    price_12h: Number(car.price12 || car.price || 0),
    price_24h: Number(car.price24 || 0),
    city: car.city,
    photos: car.photos || [],
    available: car.available !== false,
  };
  if (isUuid(car.id)) row.id = car.id;
  return row;
}

export async function fetchCars() {
  const { data, error } = await supabase.from("vehicles").select("*");
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function upsertCar(car) {
  const { data, error } = await supabase
    .from("vehicles")
    .upsert(toRow(car))
    .select("id")
    .single();
  if (error) throw error;
  return data?.id;
}

export async function deleteCar(id) {
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchCities() {
  const { data, error } = await supabase.from("cities").select("*");
  if (error) throw error;
  return data || [];
}

export async function upsertCity(city) {
  const row = {
    name: city.name,
    active: city.active !== false,
  };
  if (isUuid(city.id)) row.id = city.id;
  const { error } = await supabase.from("cities").upsert(row);
  if (error) throw error;
}

export async function fetchBookings() {
  const { data, error } = await supabase.from("bookings").select("*");
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    carId: row.vehicle_id,
    carName: row.car_name || "",
    name: row.customer_name,
    phone: row.phone,
    rentalDuration: row.hours,
    hours: row.hours,
    total: Number(row.amount || 0),
    paidAmount: Number(row.amount || 0),
    remainingAmount: 0,
    payment_status: row.payment_status,
    status: row.payment_status || "pending",
  }));
}

export async function insertBooking(b) {
  const row = {
    customer_name: b.name || b.customer_name,
    phone: b.phone,
    hours: Number(b.hours || b.rentalDuration || 0),
    amount: Number(b.amount || b.total || b.paidAmount || 0),
    payment_status: b.payment_status || b.status || "pending",
  };
  if (isUuid(b.id)) row.id = b.id;
  if (isUuid(b.carId || b.vehicle_id)) row.vehicle_id = b.carId || b.vehicle_id;
  const { error } = await supabase.from("bookings").insert(row);
  if (error) throw error;
}

export async function uploadPhoto(fileOrDataUrl) {
  let file = fileOrDataUrl;
  let name = `car-${Date.now()}.jpg`;

  if (typeof fileOrDataUrl === "string" && fileOrDataUrl.startsWith("data:")) {
    const res = await fetch(fileOrDataUrl);
    const blob = await res.blob();
    file = blob;
  } else if (fileOrDataUrl?.name) {
    name = `${Date.now()}-${fileOrDataUrl.name.replace(/\s+/g, "-")}`;
  }

  const { error } = await supabase.storage.from(BUCKET).upload(name, file, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
  return data.publicUrl;
}

export async function insertLead(lead) {
  const { error } = await supabase.from("leads").insert({
    name: lead.name || "",
    phone: lead.phone,
    city: lead.city || "",
    car_name: lead.carName || lead.car_name || "",
    message: lead.message || "",
  });
  if (error) throw error;
}
export async function fetchLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function fetchLeads() {
  const { data, error } = await supabase.from("leads").select("*");
  if (error) {
    console.error(error);
    return [];
  }
  return (data || []).sort((a, b) =>
    String(b.created_at || "").localeCompare(String(a.created_at || ""))
  );
}
