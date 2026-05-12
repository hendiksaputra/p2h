export function DbUnavailable({ message }: { message?: string }) {
  const detail =
    message ??
    "Pastikan MySQL XAMPP berjalan, database `p2h` sudah dibuat, lalu jalankan `npx prisma migrate deploy` dan `npm run db:seed`.";

  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      role="alert"
    >
      <p className="font-medium">Tidak dapat memuat data dari database</p>
      <p className="mt-1 text-amber-800">{detail}</p>
    </div>
  );
}
