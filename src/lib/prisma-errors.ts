import { Prisma } from "@prisma/client";

/** Pesan aman untuk ditampilkan ke pengguna dari error Prisma / DB. */
export function userMessageFromPrismaError(e: unknown, fallback: string): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return knownRequestToMessage(e, fallback);
  }

  if (e instanceof Prisma.PrismaClientValidationError) {
    const oneLine = e.message.replace(/\s+/g, " ").trim();
    if (/Unknown argument|Unknown field/i.test(oneLine)) {
      return "Data tidak cocok dengan skema Prisma. Hentikan server, jalankan npx prisma generate, lalu npm run dev lagi.";
    }
    if (process.env.NODE_ENV === "development") {
      const tail = extractValidationDetail(oneLine);
      return `${fallback} [dev: ${tail.slice(0, 700)}]`;
    }
    return fallback;
  }

  const code = getPrismaCode(e);
  const name = e instanceof Error ? e.name : "";
  const raw = e instanceof Error ? e.message : String(e);
  const msg = cleanPrismaMessage(raw);

  if (code === "P1001" || code === "P1017") {
    return "Tidak dapat terhubung ke MySQL. Pastikan XAMPP MySQL menyala dan DATABASE_URL di file .env benar.";
  }

  if (code === "P2002") {
    return "Data bentrok dengan rekaman yang sudah ada (misalnya nomor polisi sudah dipakai).";
  }

  if (
    code === "P2022" ||
    code === "P2010" ||
    /unknown column|doesn't exist|tidak ada kolom/i.test(msg)
  ) {
    return "Tabel database belum sesuai skema aplikasi. Di folder proyek jalankan: npx prisma migrate deploy lalu restart server (npm run dev).";
  }

  if (/Unknown arg|Unknown field|Invalid value|Expected/i.test(msg)) {
    return "Data tidak cocok dengan skema Prisma. Hentikan server, jalankan npx prisma generate, lalu npm run dev lagi.";
  }

  if (process.env.NODE_ENV === "development" && (code || name || msg)) {
    const hint = [code || name, msg.slice(0, 800)].filter(Boolean).join(" — ");
    return `${fallback} [dev: ${hint}]`;
  }

  return fallback;
}

function knownRequestToMessage(e: Prisma.PrismaClientKnownRequestError, fallback: string): string {
  switch (e.code) {
    case "P1001":
    case "P1017":
      return "Tidak dapat terhubung ke MySQL. Pastikan XAMPP MySQL menyala dan DATABASE_URL di file .env benar.";
    case "P2002":
      return "Data bentrok dengan rekaman yang sudah ada (misalnya nomor polisi sudah dipakai).";
    case "P2022":
    case "P2010":
      return "Tabel database belum sesuai skema aplikasi. Jalankan: npx prisma migrate deploy lalu restart npm run dev.";
    default:
      if (process.env.NODE_ENV === "development") {
        const meta = e.meta ? JSON.stringify(e.meta) : "";
        return `${fallback} [dev: ${e.code}${meta ? ` — ${meta}` : ""}]`;
      }
      return fallback;
  }
}

function extractValidationDetail(oneLine: string): string {
  const inv = oneLine.indexOf("invocation");
  if (inv === -1) return oneLine;
  const after = oneLine.slice(inv);
  const arg = after.indexOf("Argument");
  if (arg !== -1) return oneLine.slice(inv + arg).slice(0, 700);
  return oneLine.slice(0, 700);
}

/** Hilangkan noise path Turbopack / bundler; ambil isi error Prisma yang relevan. */
function cleanPrismaMessage(message: string): string {
  let m = message.replace(/\b__TURBOPACK__[^\s)]*/g, "");
  m = m.replace(/\$5b\$[^\s]*/g, "");
  const chunks = m.split(/\n{2,}/);
  if (chunks.length > 1) {
    const tail = chunks.slice(1).join("\n\n").trim();
    if (tail.length > 20) {
      m = tail;
    }
  }
  const lines = m
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.includes("imported__module") && !l.includes("$5b$project$5d"));
  return lines.join("\n").trim() || message.trim();
}

function getPrismaCode(e: unknown): string {
  if (!e || typeof e !== "object") return "";
  if ("code" in e && typeof (e as { code: unknown }).code === "string") {
    return (e as { code: string }).code;
  }
  return "";
}
