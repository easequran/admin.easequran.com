import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Best-guess primary IANA timezone per country. For single-timezone (or
 * effectively single-timezone-for-our-audience) countries this is exact.
 * US/Canada are handled separately via NANP area codes since they span
 * multiple zones.
 */
const COUNTRY_TIMEZONES: Record<string, string> = {
  PK: "Asia/Karachi",
  BD: "Asia/Dhaka",
  IN: "Asia/Kolkata",
  LK: "Asia/Colombo",
  NP: "Asia/Kathmandu",
  AE: "Asia/Dubai",
  SA: "Asia/Riyadh",
  QA: "Asia/Qatar",
  KW: "Asia/Kuwait",
  BH: "Asia/Bahrain",
  OM: "Asia/Muscat",
  EG: "Africa/Cairo",
  TR: "Europe/Istanbul",
  MY: "Asia/Kuala_Lumpur",
  ID: "Asia/Jakarta",
  SG: "Asia/Singapore",
  PH: "Asia/Manila",
  GB: "Europe/London",
  IE: "Europe/Dublin",
  FR: "Europe/Paris",
  DE: "Europe/Berlin",
  ES: "Europe/Madrid",
  IT: "Europe/Rome",
  NL: "Europe/Amsterdam",
  BE: "Europe/Brussels",
  SE: "Europe/Stockholm",
  NO: "Europe/Oslo",
  DK: "Europe/Copenhagen",
  FI: "Europe/Helsinki",
  PL: "Europe/Warsaw",
  ZA: "Africa/Johannesburg",
  NG: "Africa/Lagos",
  KE: "Africa/Nairobi",
  AU: "Australia/Sydney",
  NZ: "Pacific/Auckland",
  JP: "Asia/Tokyo",
  KR: "Asia/Seoul",
  CN: "Asia/Shanghai",
  HK: "Asia/Hong_Kong",
  BR: "America/Sao_Paulo",
  MX: "America/Mexico_City",
  AR: "America/Argentina/Buenos_Aires",
};

/** NANP area code -> IANA timezone, for US + Canada numbers (country code +1). */
const NANP_AREA_CODE_TIMEZONES: Record<string, string> = {
  // Eastern
  "212": "America/New_York",
  "315": "America/New_York",
  "347": "America/New_York",
  "404": "America/New_York",
  "407": "America/New_York",
  "412": "America/New_York",
  "470": "America/New_York",
  "484": "America/New_York",
  "516": "America/New_York",
  "561": "America/New_York",
  "617": "America/New_York",
  "631": "America/New_York",
  "646": "America/New_York",
  "678": "America/New_York",
  "703": "America/New_York",
  "718": "America/New_York",
  "754": "America/New_York",
  "786": "America/New_York",
  "813": "America/New_York",
  "845": "America/New_York",
  "856": "America/New_York",
  "857": "America/New_York",
  "863": "America/New_York",
  "904": "America/New_York",
  "917": "America/New_York",
  "941": "America/New_York",
  "954": "America/New_York",
  "202": "America/New_York",
  "215": "America/New_York",
  "301": "America/New_York",
  "305": "America/New_York",
  "401": "America/New_York",
  "413": "America/New_York",
  "434": "America/New_York",
  "704": "America/New_York",
  "919": "America/New_York",
  "416": "America/Toronto",
  "437": "America/Toronto",
  "647": "America/Toronto",
  "613": "America/Toronto",
  "905": "America/Toronto",
  "514": "America/Toronto",
  "418": "America/Toronto",

  // Central
  "312": "America/Chicago",
  "773": "America/Chicago",
  "630": "America/Chicago",
  "224": "America/Chicago",
  "708": "America/Chicago",
  "331": "America/Chicago",
  "469": "America/Chicago",
  "214": "America/Chicago",
  "972": "America/Chicago",
  "817": "America/Chicago",
  "832": "America/Chicago",
  "713": "America/Chicago",
  "281": "America/Chicago",
  "512": "America/Chicago",
  "210": "America/Chicago",
  "314": "America/Chicago",
  "816": "America/Chicago",
  "601": "America/Chicago",
  "615": "America/Chicago",
  "901": "America/Chicago",
  "504": "America/Chicago",
  "918": "America/Chicago",
  "405": "America/Chicago",
  "316": "America/Chicago",
  "204": "America/Winnipeg",
  "306": "America/Regina",

  // Mountain
  "303": "America/Denver",
  "720": "America/Denver",
  "719": "America/Denver",
  "970": "America/Denver",
  "505": "America/Denver",
  "801": "America/Denver",
  "385": "America/Denver",
  "602": "America/Phoenix",
  "480": "America/Phoenix",
  "623": "America/Phoenix",
  "520": "America/Phoenix",
  "406": "America/Denver",
  "307": "America/Denver",
  "403": "America/Edmonton",
  "587": "America/Edmonton",

  // Pacific
  "213": "America/Los_Angeles",
  "310": "America/Los_Angeles",
  "323": "America/Los_Angeles",
  "424": "America/Los_Angeles",
  "415": "America/Los_Angeles",
  "628": "America/Los_Angeles",
  "510": "America/Los_Angeles",
  "650": "America/Los_Angeles",
  "669": "America/Los_Angeles",
  "707": "America/Los_Angeles",
  "714": "America/Los_Angeles",
  "760": "America/Los_Angeles",
  "805": "America/Los_Angeles",
  "818": "America/Los_Angeles",
  "858": "America/Los_Angeles",
  "909": "America/Los_Angeles",
  "916": "America/Los_Angeles",
  "925": "America/Los_Angeles",
  "949": "America/Los_Angeles",
  "206": "America/Los_Angeles",
  "253": "America/Los_Angeles",
  "425": "America/Los_Angeles",
  "360": "America/Los_Angeles",
  "503": "America/Los_Angeles",
  "541": "America/Los_Angeles",
  "702": "America/Los_Angeles",
  "775": "America/Los_Angeles",
  "604": "America/Vancouver",
  "778": "America/Vancouver",
  "236": "America/Vancouver",

  // Alaska / Hawaii
  "907": "America/Anchorage",
  "808": "Pacific/Honolulu",
};

export interface PhoneTimezoneGuess {
  timezone: string;
  countryCode: string; // ISO country, e.g. "PK", "US"
  countryCallingCode: string; // e.g. "1", "92"
  areaCode?: string; // NANP area code, when applicable
  label: string; // human readable, e.g. "US +1 (312)" or "Pakistan +92"
}

export function guessTimezoneFromPhone(rawPhone: string): PhoneTimezoneGuess | null {
  if (!rawPhone || rawPhone.trim().length < 4) return null;

  const parsed = parsePhoneNumberFromString(rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`);
  if (!parsed || !parsed.isValid()) return null;

  const countryCode = parsed.country ?? "";
  const countryCallingCode = parsed.countryCallingCode;

  if (countryCallingCode === "1") {
    const nationalNumber = parsed.nationalNumber; // e.g. "3125551234"
    const areaCode = nationalNumber.slice(0, 3);
    const zone = NANP_AREA_CODE_TIMEZONES[areaCode];
    if (zone) {
      return {
        timezone: zone,
        countryCode: countryCode || "US",
        countryCallingCode,
        areaCode,
        label: `${countryCode || "US"} +1 (${areaCode})`,
      };
    }
    // Unknown area code but still NANP — fall back to Eastern as the most
    // common default, clearly marked as a rough guess via the label.
    return {
      timezone: "America/New_York",
      countryCode: countryCode || "US",
      countryCallingCode,
      areaCode,
      label: `${countryCode || "US"} +1 (${areaCode}) — approximate`,
    };
  }

  const zone = COUNTRY_TIMEZONES[countryCode];
  if (!zone) return null;

  return {
    timezone: zone,
    countryCode,
    countryCallingCode,
    label: `${countryCode} +${countryCallingCode}`,
  };
}
