"use client";

import { useEffect } from "react";

type Props = {
  loginUrl: string;
  qrDataUrl: string;
};

export function PrintLoginQrPanel({ loginUrl, qrDataUrl }: Props) {
  useEffect(() => {
    document.body.dataset.printLoginQr = "1";
    return () => {
      delete document.body.dataset.printLoginQr;
    };
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-slate-900">QR code halaman login</h2>
      <p className="mt-2 text-sm text-slate-600">
        Pindai dengan kamera ponsel untuk membuka halaman login P2H. Cocok untuk stiker / kartu di unit.
      </p>

      <div className="mt-8 flex flex-col items-center gap-6">
        {/* img data URL dari server (bukan asset statis) */}
        <img
          src={qrDataUrl}
          alt={`QR menuju ${loginUrl}`}
          width={400}
          height={400}
          className="h-auto max-w-full rounded-lg border border-slate-200 bg-white p-2 shadow-sm print:border-0 print:shadow-none"
        />
        <p className="max-w-md break-all text-center font-mono text-xs text-slate-700">{loginUrl}</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Cetak / Print
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(loginUrl);
            } catch {
              window.prompt("Salin URL:", loginUrl);
            }
          }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Salin URL
        </button>
      </div>

      <p className="mt-6 text-xs text-slate-500 print:mt-4">
        Tips cetak: di dialog Print, aktifkan &quot;Background graphics&quot; bila QR terlihat pudar. Untuk domain
        tetap, set variabel lingkungan{" "}
        <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_APP_ORIGIN</code> di server.
      </p>
    </div>
  );
}
