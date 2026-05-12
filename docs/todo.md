# Todo — P2H

## Sedang / berikutnya

- [ ] Otorisasi per permission (create/read/ubah kendaraan) di server & UI.
- [ ] Peran operasional (mekanik / GA / admin) selaras dengan workflow lapangan.
- [ ] Upload foto temuan per poin checklist.
- [ ] Export PDF / Excel laporan P2H.
- [ ] Notifikasi jika ada poin NOT_OK.

## Baru selesai (2026-05-06)

- [x] Scaffold Next.js + Tailwind + Prisma MySQL.
- [x] CRUD master kendaraan + form P2H dengan checklist bawaan.
- [x] Halaman beranda ringkas, riwayat P2H, detail inspeksi.
- [x] Modul users: halaman `/settings/users` (list + input), validasi form, hashing password (`bcrypt`), menu Pengaturan + sub-nav Roles & permission (`/settings/roles`).
- [x] Login wajib: `/login`, cookie sesi JWT (`jose`), middleware, user seed `admin`, tombol keluar di header.
