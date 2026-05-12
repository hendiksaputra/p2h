export function getDbErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = "code" in error ? String((error as { code: unknown }).code) : "";
  if (code === "P1001" || code === "P1017") {
    return "Tidak dapat menghubungi server MySQL. Nyalakan XAMPP MySQL dan periksa DATABASE_URL di file .env.";
  }
  if (code === "P2021" || code === "P2010" || code === "P2022") {
    return "Skema database belum sesuai aplikasi. Di folder proyek jalankan: npx prisma migrate deploy. Jika muncul error migrasi gagal (P3009) atau tabel sudah ada, lihat catatan di MEMORY.md proyek ini.";
  }
  if (code === "P3009") {
    return "Riwayat migrasi Prisma bermasalah (P3009). Perbaiki dengan prisma migrate resolve sesuai dokumentasi Prisma, lalu migrate deploy lagi.";
  }
  return null;
}
