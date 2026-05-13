import type { Metadata } from "next";
import QRCode from "qrcode";
import { getLoginPagePublicUrl } from "@/lib/public-app-url";
import { PrintLoginQrPanel } from "./PrintLoginQrPanel";

export const metadata: Metadata = {
  title: "Cetak QR login",
  description: "QR code untuk membuka halaman login P2H",
};

export default async function PrintLoginQrPage() {
  const loginUrl = await getLoginPagePublicUrl();
  const qrDataUrl = await QRCode.toDataURL(loginUrl, {
    width: 420,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return <PrintLoginQrPanel loginUrl={loginUrl} qrDataUrl={qrDataUrl} />;
}
