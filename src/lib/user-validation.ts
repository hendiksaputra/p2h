export const userFieldKeys = ["username", "password", "nik", "fullname", "position"] as const;

export type UserFieldKey = (typeof userFieldKeys)[number];
export type UserFieldErrors = Partial<Record<UserFieldKey, string>>;

export type UserInput = {
  username: string;
  password: string;
  nik: string;
  fullname: string;
  position: string;
};

export function normalizeUserInput(formData: FormData): UserInput {
  return {
    username: String(formData.get("username") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? "").trim(),
    nik: String(formData.get("nik") ?? "").trim(),
    fullname: String(formData.get("fullname") ?? "").trim(),
    position: String(formData.get("position") ?? "").trim(),
  };
}

type ValidateOpts = {
  /** Saat true, password kosong dianggap "tidak diubah". */
  passwordOptional?: boolean;
};

export function validateUserInput(input: UserInput, opts: ValidateOpts = {}): UserFieldErrors {
  const errors: UserFieldErrors = {};

  if (!input.username) {
    errors.username = "Username wajib diisi.";
  } else if (input.username.length < 3 || input.username.length > 32) {
    errors.username = "Username 3-32 karakter.";
  } else if (!/^[a-z0-9._-]+$/.test(input.username)) {
    errors.username = "Username hanya boleh huruf kecil, angka, titik, dash, underscore.";
  }

  if (!input.password) {
    if (!opts.passwordOptional) {
      errors.password = "Password wajib diisi.";
    }
  } else if (input.password.length < 8) {
    errors.password = "Password minimal 8 karakter.";
  } else if (input.password.length > 72) {
    errors.password = "Password maksimal 72 karakter.";
  }

  if (!input.nik) {
    errors.nik = "NIK wajib diisi.";
  } else if (!/^\d{5}$/.test(input.nik)) {
    errors.nik = "NIK harus tepat 5 digit angka.";
  }

  if (!input.fullname) {
    errors.fullname = "Nama lengkap wajib diisi.";
  } else if (input.fullname.length > 120) {
    errors.fullname = "Nama lengkap maksimal 120 karakter.";
  }

  if (!input.position) {
    errors.position = "Posisi wajib diisi.";
  } else if (input.position.length > 120) {
    errors.position = "Posisi maksimal 120 karakter.";
  }

  return errors;
}
