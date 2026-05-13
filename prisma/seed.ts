import "dotenv/config";
import { hash } from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Master checklist P2H — 4 kategori sesuai UI referensi. */
const checklistCatalog: { category: string; label: string; description: string; sortOrder: number }[] = [
  { category: "Eksterior", label: "Bodi Eksterior", description: "Penyok, goresan, karat, kerusakan", sortOrder: 10 },
  {
    category: "Eksterior",
    label: "Kaca Depan & Jendela",
    description: "Retak, pecah, visibilitas",
    sortOrder: 20,
  },
  { category: "Eksterior", label: "Spion", description: "Spion samping dan kaca belakang", sortOrder: 30 },
  {
    category: "Eksterior",
    label: "Wiper & washer",
    description: "Kondisi wiper, semprotan cairan washer",
    sortOrder: 35,
  },
  { category: "Lampu & Sinyal", label: "Lampu Depan", description: "Lampu jauh dan dekat", sortOrder: 40 },
  {
    category: "Lampu & Sinyal",
    label: "Lampu Belakang & Rem",
    description: "Lampu belakang dan lampu rem",
    sortOrder: 50,
  },
  {
    category: "Lampu & Sinyal",
    label: "Lampu Sein",
    description: "Indikator depan dan belakang",
    sortOrder: 60,
  },
  {
    category: "Mekanikal",
    label: "Ban",
    description: "Ketebalan tapak, tekanan, kerusakan",
    sortOrder: 70,
  },
  { category: "Mekanikal", label: "Rem", description: "Respons pedal, tenaga pengereman", sortOrder: 80 },
  { category: "Mekanikal", label: "Kemudi", description: "Respons, keselarasan", sortOrder: 90 },
  { category: "Mekanikal", label: "Level Cairan", description: "Oli, coolant, cairan washer", sortOrder: 100 },
  {
    category: "Mekanikal",
    label: "Mesin",
    description: "Menyala dengan baik, tidak ada suara aneh",
    sortOrder: 110,
  },
  {
    category: "Keselamatan & Interior",
    label: "Klakson",
    description: "Berfungsi dengan baik",
    sortOrder: 120,
  },
  {
    category: "Keselamatan & Interior",
    label: "Sabuk Pengaman",
    description: "Semua sabuk terkunci dan terlepas",
    sortOrder: 130,
  },
  {
    category: "Keselamatan & Interior",
    label: "Perlengkapan Darurat",
    description: "APAR, P3K, segitiga pengaman",
    sortOrder: 140,
  },
  {
    category: "Keselamatan & Interior",
    label: "Kebersihan Interior",
    description: "Kabin bersih dan teratur",
    sortOrder: 150,
  },
];

/** Checklist P2H untuk kendaraan alat berat (nomor polisi ALAT BERAT). */
const heavyEquipmentChecklistCatalog: {
  category: string;
  label: string;
  description: string;
  sortOrder: number;
}[] = [
  {
    category: "UNDERCARRIAGE",
    label: "Track, roller, final drive",
    description: "Pemeriksaan track, roller, dan final drive (kondisi, kekencangan, keausan).",
    sortOrder: 800,
  },
  {
    category: "ATTACHMENT",
    label: "Fork, boom, arm, bucket, main hook, chain, wire rope",
    description: "Pemeriksaan fork, boom, arm, bucket, main hook, chain, dan wire rope.",
    sortOrder: 810,
  },
  {
    category: "CYLINDER",
    label: "Cylinder & hose",
    description: "Pemeriksaan kebocoran cylinder dan hose.",
    sortOrder: 820,
  },
  {
    category: "VESSEL",
    label: "Dump vessel, long vessel, tipper vessel",
    description: "Pemeriksaan dump vessel, long vessel, dan tipper vessel.",
    sortOrder: 830,
  },
];

/** Kategori master lama — seluruh poin di dalamnya dinonaktifkan (data tetap ada untuk riwayat P2H). */
const REMOVED_CHECKLIST_CATEGORIES = [
  "Ban & roda",
  "Bodi & kaca",
  "Kelistrikan",
  "Keselamatan",
  "Lampu",
  "Mesin",
  "Rem",
] as const;

async function seedChecklistCatalog() {
  const combinedCatalog = [...checklistCatalog, ...heavyEquipmentChecklistCatalog];
  const catalogKeys = new Set(combinedCatalog.map((x) => `${x.category}::${x.label}`));

  for (const row of combinedCatalog) {
    const existing = await prisma.checklistItem.findFirst({
      where: { category: row.category, label: row.label },
    });
    if (existing) {
      await prisma.checklistItem.update({
        where: { id: existing.id },
        data: {
          description: row.description,
          sortOrder: row.sortOrder,
          isActive: true,
        },
      });
    } else {
      await prisma.checklistItem.create({
        data: {
          category: row.category,
          label: row.label,
          description: row.description,
          sortOrder: row.sortOrder,
          isActive: true,
        },
      });
    }
  }

  const all = await prisma.checklistItem.findMany({ select: { id: true, category: true, label: true } });
  let deactivated = 0;
  for (const x of all) {
    if (!catalogKeys.has(`${x.category}::${x.label}`)) {
      await prisma.checklistItem.update({ where: { id: x.id }, data: { isActive: false } });
      deactivated += 1;
    }
  }

  const legacyOff = await prisma.checklistItem.updateMany({
    where: { category: { in: [...REMOVED_CHECKLIST_CATEGORIES] } },
    data: { isActive: false },
  });

  console.log(
    `Seed checklist: ${combinedCatalog.length} poin aktif (${checklistCatalog.length} jalan + ${heavyEquipmentChecklistCatalog.length} alat berat); ${deactivated} poin di luar katalog dinonaktifkan; ${legacyOff.count} baris pada kategori lama dipastikan nonaktif.`,
  );
}

const vehiclePermissions: { key: string; label: string }[] = [
  { key: "create.vehicles", label: "Membuat data kendaraan" },
  { key: "ubah.vehicles", label: "Mengubah data kendaraan" },
  { key: "read.vehicles", label: "Membaca data kendaraan" },
];

const settingsPermissions: { key: string; label: string }[] = [
  { key: "read.settings", label: "Membuka halaman Pengaturan" },
  { key: "manage.users", label: "Mengelola Users di Pengaturan" },
  { key: "manage.roles", label: "Mengatur Roles & permission" },
];

const inspectionPermissions: { key: string; label: string }[] = [
  { key: "create.p2h", label: "Membuat P2H baru" },
  { key: "detail.p2h", label: "Melihat detail P2H" },
  { key: "edit.p2h", label: "Mengedit / mengoreksi P2H" },
  { key: "delete.p2h", label: "Menghapus data P2H" },
  { key: "repair.p2h", label: "Mencatat tindakan perbaikan P2H" },
];

async function seedRbac() {
  const allPermissionDefs = [...vehiclePermissions, ...inspectionPermissions, ...settingsPermissions];

  for (const p of allPermissionDefs) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: { key: p.key, label: p.label },
      update: { label: p.label },
    });
  }

  const allPerms = await prisma.permission.findMany({
    where: { key: { in: allPermissionDefs.map((x) => x.key) } },
  });
  const byKey = Object.fromEntries(
    allPerms.map((x: { key: string; id: string }) => [x.key, x.id]),
  ) as Record<string, string>;

  const roleDefs: { slug: string; name: string; keys: string[] }[] = [
    {
      slug: "vehicle_admin",
      name: "Admin kendaraan (semua izin)",
      keys: [
        "create.vehicles",
        "ubah.vehicles",
        "read.vehicles",
        "create.p2h",
        "detail.p2h",
        "edit.p2h",
        "delete.p2h",
        "repair.p2h",
        "read.settings",
        "manage.users",
        "manage.roles",
      ],
    },
    {
      slug: "vehicle_viewer",
      name: "Hanya baca kendaraan",
      keys: ["read.vehicles"],
    },
  ];

  for (const r of roleDefs) {
    const role = await prisma.role.upsert({
      where: { slug: r.slug },
      create: { name: r.name, slug: r.slug },
      update: { name: r.name },
    });

    const permissionIds = r.keys.map((k) => byKey[k]).filter(Boolean);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }
  }

  console.log("Seed RBAC: permission + role default siap.");
}

/** User pertama agar bisa login sebelum menambah user lewat UI (username: `admin`). */
async function seedDefaultAdmin() {
  const passwordPlain = process.env.SEED_ADMIN_PASSWORD?.trim() || "Admin1234!";
  if (passwordPlain.length < 8) {
    console.warn("SEED_ADMIN_PASSWORD kurang dari 8 karakter — lewati seed user admin.");
    return;
  }

  const role = await prisma.role.findUnique({ where: { slug: "vehicle_admin" } });
  const passwordHash = await hash(passwordPlain, 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    create: {
      username: "admin",
      password: passwordHash,
      nik: "10001",
      fullname: "Administrator",
      position: "Admin",
      roleId: role?.id ?? null,
    },
    update: {
      password: passwordHash,
      roleId: role?.id ?? undefined,
    },
  });

  console.log(
    "Seed: user `admin` siap. Password dari env SEED_ADMIN_PASSWORD atau default dev (ganti setelah login).",
  );
}

async function main() {
  await seedChecklistCatalog();
  await seedRbac();
  await seedDefaultAdmin();
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
