import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const BUCKET = "Cars";

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
    city: row.city,
    photos: row.photos || [],
    available: row.available !== false,
  };
}

function toRow(car) {
  return {
    id: car.id,
    name: car.name,
    type: car.type,
    seats: Number(car.seats || 0),
    fuel: car.fuel,
    transmission: car.transmission,
    price_8h: Number(car.price8 || 0),
    price_12h: Number(car.price12 || car.price || 0),
    city: car.city,
    photos: car.photos || [],
    available: car.available !== false,
  };
}

export async function fetchCars() {
  const { data, error } = await supabase.from("vehicles").select("*");
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function upsertCar(car) {
  const { error } = await supabase.from("vehicles").upsert(toRow(car));
  if (error) throw error;
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
  const { error } = await supabase.from("cities").upsert({
    id: city.id,
    name: city.name,
    active: city.active !== false,
  });
  if (error) throw error;
}

export async function fetchBookings() {
  const { data, error } = await supabase.from("bookings").select("*");
  if (error) throw error;
  return data || [];
}

export async function insertBooking(b) {
  const { error } = await supabase.from("bookings").insert({
    id: b.id,
    vehicle_id: b.carId || b.vehicle_id || null,
    customer_name: b.name || b.customer_name,
    phone: b.phone,
    hours: Number(b.hours || 0),
    amount: Number(b.amount || b.total || 0),
    payment_status: b.payment_status || b.status || "pending",
  });
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
