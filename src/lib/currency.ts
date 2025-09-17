/**
 * Currency formatting utilities
 */

export type Currency =
  | "USD"
  | "GBP"
  | "EUR"
  | "CAD"
  | "AUD"
  | "JPY"
  | "CHF"
  | "SEK"
  | "NOK"
  | "DKK"
  | "PLN"
  | "CZK"
  | "HUF"
  | "RON"
  | "BGN"
  | "HRK"
  | "RSD"
  | "MKD"
  | "ALL"
  | "BAM"
  | "MDL"
  | "UAH"
  | "GEL"
  | "AZN"
  | "AMD"
  | "KZT"
  | "KGS"
  | "TJS"
  | "TMT"
  | "UZS"
  | "MNT"
  | "LAK"
  | "KHR"
  | "VND"
  | "THB"
  | "MYR"
  | "SGD"
  | "IDR"
  | "PHP"
  | "BND"
  | "MMK"
  | "LKR"
  | "BDT"
  | "PKR"
  | "AFN"
  | "NPR"
  | "BTN"
  | "MVR"
  | "SCR"
  | "MUR"
  | "KMF"
  | "DJF"
  | "SOS"
  | "ETB"
  | "ERN"
  | "SDG"
  | "SSP"
  | "EGP"
  | "LYD"
  | "TND"
  | "DZD"
  | "MAD"
  | "MRO"
  | "MUR"
  | "SCR"
  | "KMF"
  | "DJF"
  | "SOS"
  | "ETB"
  | "ERN"
  | "SDG"
  | "SSP"
  | "EGP"
  | "LYD"
  | "TND"
  | "DZD"
  | "MAD";

export interface CurrencyConfig {
  symbol: string;
  position: "before" | "after";
  decimals: number;
  locale: string;
}

const CURRENCY_CONFIGS: Record<Currency, CurrencyConfig> = {
  // Major currencies
  USD: { symbol: "$", position: "before", decimals: 2, locale: "en-US" },
  GBP: { symbol: "£", position: "before", decimals: 2, locale: "en-GB" },
  EUR: { symbol: "€", position: "before", decimals: 2, locale: "de-DE" },
  CAD: { symbol: "C$", position: "before", decimals: 2, locale: "en-CA" },
  AUD: { symbol: "A$", position: "before", decimals: 2, locale: "en-AU" },
  JPY: { symbol: "¥", position: "before", decimals: 0, locale: "ja-JP" },
  CHF: { symbol: "CHF", position: "after", decimals: 2, locale: "de-CH" },

  // European currencies
  SEK: { symbol: "kr", position: "after", decimals: 2, locale: "sv-SE" },
  NOK: { symbol: "kr", position: "after", decimals: 2, locale: "nb-NO" },
  DKK: { symbol: "kr", position: "after", decimals: 2, locale: "da-DK" },
  PLN: { symbol: "zł", position: "after", decimals: 2, locale: "pl-PL" },
  CZK: { symbol: "Kč", position: "after", decimals: 2, locale: "cs-CZ" },
  HUF: { symbol: "Ft", position: "after", decimals: 0, locale: "hu-HU" },
  RON: { symbol: "lei", position: "after", decimals: 2, locale: "ro-RO" },
  BGN: { symbol: "лв", position: "after", decimals: 2, locale: "bg-BG" },
  HRK: { symbol: "kn", position: "after", decimals: 2, locale: "hr-HR" },
  RSD: { symbol: "дин", position: "after", decimals: 2, locale: "sr-RS" },
  MKD: { symbol: "ден", position: "after", decimals: 2, locale: "mk-MK" },
  ALL: { symbol: "L", position: "after", decimals: 2, locale: "sq-AL" },
  BAM: { symbol: "KM", position: "after", decimals: 2, locale: "bs-BA" },
  MDL: { symbol: "L", position: "after", decimals: 2, locale: "ro-MD" },

  // Other currencies (fallback to USD format)
  UAH: { symbol: "₴", position: "after", decimals: 2, locale: "uk-UA" },
  GEL: { symbol: "₾", position: "after", decimals: 2, locale: "ka-GE" },
  AZN: { symbol: "₼", position: "after", decimals: 2, locale: "az-AZ" },
  AMD: { symbol: "֏", position: "after", decimals: 2, locale: "hy-AM" },
  KZT: { symbol: "₸", position: "after", decimals: 2, locale: "kk-KZ" },
  KGS: { symbol: "сом", position: "after", decimals: 2, locale: "ky-KG" },
  TJS: { symbol: "SM", position: "after", decimals: 2, locale: "tg-TJ" },
  TMT: { symbol: "T", position: "after", decimals: 2, locale: "tk-TM" },
  UZS: { symbol: "so'm", position: "after", decimals: 2, locale: "uz-UZ" },
  MNT: { symbol: "₮", position: "after", decimals: 2, locale: "mn-MN" },
  LAK: { symbol: "₭", position: "after", decimals: 2, locale: "lo-LA" },
  KHR: { symbol: "៛", position: "after", decimals: 2, locale: "km-KH" },
  VND: { symbol: "₫", position: "after", decimals: 0, locale: "vi-VN" },
  THB: { symbol: "฿", position: "before", decimals: 2, locale: "th-TH" },
  MYR: { symbol: "RM", position: "before", decimals: 2, locale: "ms-MY" },
  SGD: { symbol: "S$", position: "before", decimals: 2, locale: "en-SG" },
  IDR: { symbol: "Rp", position: "before", decimals: 0, locale: "id-ID" },
  PHP: { symbol: "₱", position: "before", decimals: 2, locale: "en-PH" },
  BND: { symbol: "B$", position: "before", decimals: 2, locale: "ms-BN" },
  MMK: { symbol: "K", position: "before", decimals: 2, locale: "my-MM" },
  LKR: { symbol: "Rs", position: "before", decimals: 2, locale: "si-LK" },
  BDT: { symbol: "৳", position: "before", decimals: 2, locale: "bn-BD" },
  PKR: { symbol: "Rs", position: "before", decimals: 2, locale: "ur-PK" },
  AFN: { symbol: "؋", position: "after", decimals: 2, locale: "fa-AF" },
  NPR: { symbol: "Rs", position: "before", decimals: 2, locale: "ne-NP" },
  BTN: { symbol: "Nu", position: "before", decimals: 2, locale: "dz-BT" },
  MVR: { symbol: "Rf", position: "before", decimals: 2, locale: "dv-MV" },
  SCR: { symbol: "₨", position: "before", decimals: 2, locale: "en-SC" },
  MUR: { symbol: "₨", position: "before", decimals: 2, locale: "en-MU" },
  KMF: { symbol: "CF", position: "after", decimals: 0, locale: "ar-KM" },
  DJF: { symbol: "Fdj", position: "after", decimals: 0, locale: "fr-DJ" },
  SOS: { symbol: "S", position: "before", decimals: 2, locale: "so-SO" },
  ETB: { symbol: "Br", position: "before", decimals: 2, locale: "am-ET" },
  ERN: { symbol: "Nfk", position: "before", decimals: 2, locale: "ti-ER" },
  SDG: { symbol: "ج.س", position: "before", decimals: 2, locale: "ar-SD" },
  SSP: { symbol: "£", position: "before", decimals: 2, locale: "en-SS" },
  EGP: { symbol: "£", position: "before", decimals: 2, locale: "ar-EG" },
  LYD: { symbol: "ل.د", position: "before", decimals: 3, locale: "ar-LY" },
  TND: { symbol: "د.ت", position: "before", decimals: 3, locale: "ar-TN" },
  DZD: { symbol: "د.ج", position: "before", decimals: 2, locale: "ar-DZ" },
  MAD: { symbol: "د.م.", position: "before", decimals: 2, locale: "ar-MA" },
  MRO: { symbol: "UM", position: "before", decimals: 2, locale: "ar-MR" },
};

/**
 * Format a number as currency with the appropriate symbol and formatting
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  options: {
    showSymbol?: boolean;
    showCode?: boolean;
    compact?: boolean;
  } = {},
): string {
  const { showSymbol = true, showCode = false, compact = false } = options;

  // Normalize currency code
  const normalizedCurrency = currency.toUpperCase() as Currency;
  const config = CURRENCY_CONFIGS[normalizedCurrency] || CURRENCY_CONFIGS.USD;

  // Format the number
  const formattedNumber = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
    notation: compact ? "compact" : "standard",
  }).format(amount);

  // Add currency symbol/code
  if (showSymbol && config.symbol) {
    if (config.position === "before") {
      return `${config.symbol}${formattedNumber}`;
    } else {
      return `${formattedNumber} ${config.symbol}`;
    }
  } else if (showCode) {
    return `${formattedNumber} ${normalizedCurrency}`;
  }

  return formattedNumber;
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: string = "USD"): string {
  const normalizedCurrency = currency.toUpperCase() as Currency;
  const config = CURRENCY_CONFIGS[normalizedCurrency] || CURRENCY_CONFIGS.USD;
  return config.symbol;
}

/**
 * Get currency configuration for a given currency code
 */
export function getCurrencyConfig(currency: string = "USD"): CurrencyConfig {
  const normalizedCurrency = currency.toUpperCase() as Currency;
  return CURRENCY_CONFIGS[normalizedCurrency] || CURRENCY_CONFIGS.USD;
}
