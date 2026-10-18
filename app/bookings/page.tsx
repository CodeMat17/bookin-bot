import { getApartment, naira } from "@/lib/property";
import { FileStore } from "@/lib/store";
import { connection } from "next/server";

// The live bookings log for the real WhatsApp bot, when you run it locally behind a
// tunnel (see README). On the public demo there is no store, so it shows as empty.

export default async function Bookings() {
  await connection();
  const bookings = new FileStore().bookings().toReversed();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Bookings</h1>
      <p className="mt-2 text-sm text-muted-foreground">Live log from the WhatsApp bot. Refresh to update.</p>
      <div className="mt-8 overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              {["Ref", "Guest", "Phone", "Apartment", "Dates", "Amount", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No bookings yet
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.reference} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{b.reference}</td>
                  <td className="px-4 py-3">
                    {b.guest_name}
                    <span className="block text-xs text-muted-foreground">{b.guest_email}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.phone.replace("whatsapp:", "")}</td>
                  <td className="px-4 py-3">{getApartment(b.apartment_id)?.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {b.check_in} → {b.check_out}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">{naira(b.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={b.status === "paid" ? "text-primary" : "text-warn"}>
                      {b.status === "paid" ? "Paid" : "Awaiting payment"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
