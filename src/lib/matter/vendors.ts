// Matter Vendor ID → 제조사 이름. (CSA DCL 기준, 자주 보는 것 위주)
const VENDOR_NAMES: Record<number, string> = {
  0x100b: "Signify (Philips Hue)",
  0x1217: "Amazon",
  0x1349: "Apple",
  0x117c: "IKEA",
  0x115f: "Aqara",
  0x130a: "Eve",
  0x6006: "Google",
  0xfff1: "Test Vendor",
};

export function vendorName(id: number): string | undefined {
  return VENDOR_NAMES[id];
}
