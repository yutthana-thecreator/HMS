export const PAYMENT_METHODS: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน",
  card: "บัตรเครดิต",
  promptpay: "PromptPay",
  other: "อื่นๆ",
};

export function paymentStatus(total: number, paid: number): { key: string; label: string } {
  if (paid <= 0) return { key: "unpaid", label: "ยังไม่จ่าย" };
  if (paid + 0.001 < total) return { key: "partial", label: "มัดจำ/บางส่วน" };
  return { key: "paid", label: "จ่ายครบ" };
}
