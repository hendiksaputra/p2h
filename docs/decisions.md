# Keputusan teknis

## 2026-05-06 — Prisma 6 vs 7 untuk XAMPP MySQL

**Keputusan:** Tetap di **Prisma 6** dengan `DATABASE_URL` di `schema.prisma`.

**Konteks:** Prisma 7 (client rust-free) mengharuskan `adapter` atau Accelerate di konstruktor `PrismaClient`, yang menambah kompleksitas untuk lingkungan XAMPP lokal.

**Alternatif:** `@prisma/adapter-mariadb` + driver terpisah, atau layanan Accelerate.

**Review:** Saat upgrade ke Prisma 7 diperlukan, sesuaikan `src/lib/db.ts` dengan adapter resmi untuk MySQL/MariaDB.
