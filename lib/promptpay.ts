// สร้าง PromptPay QR (มาตรฐาน EMVCo ของธนาคารแห่งประเทศไทย)
import QRCode from "qrcode";

const PROMPTPAY_ID = process.env.PROMPTPAY_ID || "";

export function promptpayConfigured(): boolean {
  return PROMPTPAY_ID.replace(/[^0-9]/g, "").length >= 10;
}

function tlv(id: string, value: string): string {
  return id + value.length.toString().padStart(2, "0") + value;
}

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// phone → 0066xxxxxxxxx (13 หลัก), เลขบัตร 13 หลัก → ใช้ตรง
function formatTarget(id: string): { tag: string; value: string } {
  const digits = id.replace(/[^0-9]/g, "");
  if (digits.length >= 13) return { tag: "02", value: digits }; // เลขประจำตัวผู้เสียภาษี/บัตร ปชช.
  const phone = ("0000000000000" + digits.replace(/^0/, "66")).slice(-13);
  return { tag: "01", value: phone }; // เบอร์โทร (MSISDN)
}

/** สร้าง payload string ของ PromptPay (มี amount = dynamic QR) */
export function promptPayPayload(target: string, amountTHB: number): string {
  const t = formatTarget(target);
  const merchant = tlv("29", tlv("00", "A000000677010111") + tlv(t.tag, t.value));
  const data =
    tlv("00", "01") +
    tlv("01", "12") + // dynamic (จ่ายครั้งเดียว ตามยอด)
    merchant +
    tlv("58", "TH") +
    tlv("53", "764") + // THB
    tlv("54", amountTHB.toFixed(2));
  return data + "6304" + crc16(data + "6304");
}

/** สร้าง QR เป็น data URL (PNG) จากยอดเงิน */
export async function promptPayQrDataUrl(amountTHB: number): Promise<string> {
  const payload = promptPayPayload(PROMPTPAY_ID, amountTHB);
  return QRCode.toDataURL(payload, { width: 320, margin: 1, errorCorrectionLevel: "M" });
}
