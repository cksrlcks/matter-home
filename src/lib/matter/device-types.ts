// Matter Device Type ID → 사람이 읽을 이름. (이 프로젝트에서 만날 법한 것 위주)
// Descriptor cluster(0x1D)의 DeviceTypeList에서 읽은 ID를 매핑한다.
const DEVICE_TYPE_NAMES: Record<number, string> = {
  0x0016: "Root Node",
  0x0011: "Power Source",
  0x000e: "Aggregator",
  0x0013: "Bridged Node",
  0x0100: "On/Off Light",
  0x0101: "Dimmable Light",
  0x010c: "Color Temperature Light",
  0x010d: "Extended Color Light",
  0x010a: "On Off Plug In Unit",
  0x010b: "Dimmable Plug-In Unit",
  0x0103: "On/Off Light Switch",
  0x0104: "Dimmer Switch",
  0x0106: "Light Sensor",
  0x0107: "Occupancy Sensor",
  0x0015: "Contact Sensor",
  0x0302: "Temperature Sensor",
  0x0307: "Humidity Sensor",
  0x0510: "Electrical Sensor",
};

export function deviceTypeName(id: number): string | undefined {
  return DEVICE_TYPE_NAMES[id];
}
