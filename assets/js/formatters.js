/* =========================================================
   MedOrbits -- assets/js/formatters.js
   Currency, dates, numbers, text, files, and display utilities
   ========================================================= */
(function (window) {
  "use strict";
  const DEFAULT_LOCALE = "en-IN";
  const DEFAULT_CURRENCY = "INR";
  const currencyFormatters = new Map();
  const numberFormatters = new Map();
  const dateFormatters = new Map();
  const relativeDateFormatters = new Map();
  function toNumber(value, fallback = 0) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : fallback;
    }
    if (value === null || value === undefined || value === "") {
      return fallback;
    }
    const number = Number(String(value).replace(/,/g, "").trim());
    return Number.isFinite(number) ? number : fallback;
  }
  function isValidDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    return !Number.isNaN(date.getTime());
  }
  function toDate(value) {
    if (value instanceof Date) {
      return isValidDate(value) ? value : null;
    }
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const date = new Date(value);
    return isValidDate(date) ? date : null;
  }
  function formatCurrency(value, options = {}) {
    const amount = toNumber(value, NaN);
    if (!Number.isFinite(amount)) {
      return options.fallback ?? "--";
    }
    const locale = options.locale || DEFAULT_LOCALE;
    const currency = options.currency || DEFAULT_CURRENCY;
    const minimumFractionDigits = options.minimumFractionDigits ?? 0;
    const maximumFractionDigits = options.maximumFractionDigits ?? 0;
    const key = JSON.stringify({
      locale,
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
      currencyDisplay: options.currencyDisplay || "symbol"
    });
    try {
      if (!currencyFormatters.has(key)) {
        currencyFormatters.set(
          key,
          new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            currencyDisplay: options.currencyDisplay || "symbol",
            minimumFractionDigits,
            maximumFractionDigits
          })
        );
      }
      return currencyFormatters.get(key).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString(locale)}`;
    }
  }
  function formatCompactCurrency(value, options = {}) {
    const amount = toNumber(value, NaN);
    if (!Number.isFinite(amount)) {
      return options.fallback ?? "--";
    }
    const locale = options.locale || DEFAULT_LOCALE;
    const currency = options.currency || DEFAULT_CURRENCY;
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: options.maximumFractionDigits ?? 1
      }).format(amount);
    } catch {
      return formatCurrency(amount, options);
    }
  }
  function formatNumber(value, options = {}) {
    const number = toNumber(value, NaN);
    if (!Number.isFinite(number)) {
      return options.fallback ?? "--";
    }
    const locale = options.locale || DEFAULT_LOCALE;
    const key = JSON.stringify({
      locale,
      minimumFractionDigits: options.minimumFractionDigits ?? 0,
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
      useGrouping: options.useGrouping !== false
    });
    try {
      if (!numberFormatters.has(key)) {
        numberFormatters.set(
          key,
          new Intl.NumberFormat(locale, {
            minimumFractionDigits: options.minimumFractionDigits ?? 0,
            maximumFractionDigits: options.maximumFractionDigits ?? 2,
            useGrouping: options.useGrouping !== false
          })
        );
      }
      return numberFormatters.get(key).format(number);
    } catch {
      return String(number);
    }
  }
  function formatCompactNumber(value, options = {}) {
    const number = toNumber(value, NaN);
    if (!Number.isFinite(number)) {
      return options.fallback ?? "--";
    }
    try {
      return new Intl.NumberFormat(options.locale || DEFAULT_LOCALE, {
        notation: "compact",
        compactDisplay: options.compactDisplay || "short",
        maximumFractionDigits: options.maximumFractionDigits ?? 1
      }).format(number);
    } catch {
      return formatNumber(number, options);
    }
  }
  function formatPercentage(value, options = {}) {
    const number = toNumber(value, NaN);
    if (!Number.isFinite(number)) {
      return options.fallback ?? "--";
    }
    const percentage = options.valueIsFraction
      ? number
      : number / 100;
    try {
      return new Intl.NumberFormat(options.locale || DEFAULT_LOCALE, {
        style: "percent",
        minimumFractionDigits: options.minimumFractionDigits ?? 0,
        maximumFractionDigits: options.maximumFractionDigits ?? 1
      }).format(percentage);
    } catch {
      return `${number}%`;
    }
  }
  function formatDate(value, options = {}) {
    const date = toDate(value);
    if (!date) return options.fallback ?? "--";
    const locale = options.locale || DEFAULT_LOCALE;
    const dateOptions = {
      day: options.day || "numeric",
      month: options.month || "short",
      year: options.year || "numeric",
      ...(options.dateOptions || {})
    };
    const key = JSON.stringify({ locale, dateOptions });
    try {
      if (!dateFormatters.has(key)) {
        dateFormatters.set(
          key,
          new Intl.DateTimeFormat(locale, dateOptions)
        );
      }
      return dateFormatters.get(key).format(date);
    } catch {
      return date.toISOString().slice(0, 10);
    }
  }
  function formatDateTime(value, options = {}) {
    const date = toDate(value);
    if (!date) return options.fallback ?? "--";
    return formatDate(value, {
      ...options,
      dateOptions: {
        day: options.day || "numeric",
        month: options.month || "short",
        year: options.year || "numeric",
        hour: options.hour || "numeric",
        minute: options.minute || "2-digit",
        ...(options.dateOptions || {})
      }
    });
  }
  function formatTime(value, options = {}) {
    const date = toDate(value);
    if (!date) return options.fallback ?? "--";
    try {
      return new Intl.DateTimeFormat(options.locale || DEFAULT_LOCALE, {
        hour: options.hour || "numeric",
        minute: options.minute || "2-digit",
        ...(options.hour12 !== undefined ? { hour12: options.hour12 } : {}),
        ...(options.timeZone ? { timeZone: options.timeZone } : {})
      }).format(date);
    } catch {
      return date.toLocaleTimeString();
    }
  }
  function formatRelativeDate(value, options = {}) {
    const date = toDate(value);
    if (!date) return options.fallback ?? "--";
    const now = options.now ? toDate(options.now) : new Date();
    if (!now) return formatDate(date, options);
    const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
    const units = [
      ["year", 31536000],
      ["month", 2592000],
      ["week", 604800],
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60],
      ["second", 1]
    ];
    try {
      const locale = options.locale || DEFAULT_LOCALE;
      if (!relativeDateFormatters.has(locale)) {
        relativeDateFormatters.set(
          locale,
          new Intl.RelativeTimeFormat(locale, {
            numeric: options.numeric || "auto"
          })
        );
      }
      const formatter = relativeDateFormatters.get(locale);
      for (const [unit, divisor] of units) {
        if (Math.abs(seconds) >= divisor || unit === "second") {
          return formatter.format(Math.round(seconds / divisor), unit);
        }
      }
    } catch {
      return formatDate(date, options);
    }
    return formatDate(date, options);
  }
  function formatDateRange(startValue, endValue, options = {}) {
    const start = toDate(startValue);
    const end = toDate(endValue);
    if (!start && !end) return options.fallback ?? "--";
    if (!start) return `Until ${formatDate(end, options)}`;
    if (!end) return `From ${formatDate(start, options)}`;
    if (
      typeof Intl.DateTimeFormat.prototype.formatRange === "function"
    ) {
      try {
        return new Intl.DateTimeFormat(options.locale || DEFAULT_LOCALE, {
          day: "numeric",
          month: "short",
          year: "numeric",
          ...(options.dateOptions || {})
        }).formatRange(start, end);
      } catch {
        // Fall through to the regular date range.
      }
    }
    return `${formatDate(start, options)} – ${formatDate(end, options)}`;
  }
  function formatDuration(value, options = {}) {
    const totalMinutes = Math.max(0, Math.floor(toNumber(value, 0)));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
    if (hours) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
    if (minutes || parts.length === 0) {
      parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
    }
    return options.compact
      ? parts.map(part => part.replace(" minutes", "m").replace(" minute", "m")
        .replace(" hours", "h").replace(" hour", "h")
        .replace(" days", "d").replace(" day", "d")).join(" ")
      : parts.join(" ");
  }
  function formatFileSize(value, options = {}) {
    const bytes = toNumber(value, NaN);
    if (!Number.isFinite(bytes) || bytes < 0) {
      return options.fallback ?? "--";
    }
    if (bytes === 0) return "0 Bytes";
    const base = options.binary === false ? 1000 : 1024;
    const units = options.binary === false
      ? ["Bytes", "KB", "MB", "GB", "TB"]
      : ["Bytes", "KiB", "MiB", "GiB", "TiB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(base)),
      units.length - 1
    );
    return `${(bytes / Math.pow(base, index)).toFixed(
      index === 0 ? 0 : options.decimals ?? 2
    )} ${units[index]}`;
  }
  function truncateText(value, maxLength = 100, options = {}) {
    const text = String(value ?? "");
    const limit = Math.max(0, Number(maxLength) || 0);
    if (text.length <= limit) return text;
    const suffix = options.suffix ?? "…";
    if (limit <= suffix.length) {
      return suffix.slice(0, limit);
    }
    if (options.wordBoundary) {
      const shortened = text.slice(0, limit - suffix.length);
      const lastSpace = shortened.lastIndexOf(" ");
      if (lastSpace > 0) {
        return shortened.slice(0, lastSpace).trimEnd() + suffix;
      }
    }
    return text.slice(0, limit - suffix.length) + suffix;
  }
  function capitalize(value) {
    const text = String(value ?? "");
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  function titleCase(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\b[\p{L}\p{N}]/gu, char => char.toUpperCase());
  }
  function sentenceCase(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  function slugify(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  function formatPhone(value, options = {}) {
    const phone = String(value ?? "").trim();
    if (!phone) return options.fallback ?? "--";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    if (digits.length === 12 && digits.startsWith("91")) {
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    return phone;
  }
  function maskEmail(value) {
    const email = String(value ?? "").trim();
    const separator = email.lastIndexOf("@");
    if (separator <= 0) return email;
    const username = email.slice(0, separator);
    const domain = email.slice(separator + 1);
    const visible = username.length <= 2
      ? username.charAt(0)
      : username.slice(0, 2);
    return `${visible}${"*".repeat(Math.max(2, username.length - visible.length))}@${domain}`;
  }
  function maskPhone(value) {
    const phone = String(value ?? "").trim();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 5) return phone;
    return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
  }
  function formatName(firstName, lastName, options = {}) {
    const first = String(firstName ?? "").trim();
    const last = String(lastName ?? "").trim();
    const fullName = [first, last].filter(Boolean).join(" ");
    if (!fullName) return options.fallback ?? "--";
    return options.case === "title" ? titleCase(fullName) : fullName;
  }
  function formatAddress(address, options = {}) {
    if (typeof address === "string") {
      return address.trim() || (options.fallback ?? "--");
    }
    if (!address || typeof address !== "object") {
      return options.fallback ?? "--";
    }
    const fields = [
      address.line1 || address.addressLine1,
      address.line2 || address.addressLine2,
      address.city,
      address.state,
      address.postalCode || address.pincode || address.zipCode,
      address.country
    ];
    const parts = fields
      .map(value => String(value ?? "").trim())
      .filter(Boolean);
    return parts.length
      ? parts.join(options.separator || ", ")
      : options.fallback ?? "--";
  }
  function formatStatus(value, options = {}) {
    const text = String(value ?? "").trim();
    if (!text) return options.fallback ?? "Unknown";
    return text
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, char => char.toUpperCase());
  }
  function formatOrdinal(value, options = {}) {
    const number = Math.trunc(toNumber(value, NaN));
    if (!Number.isFinite(number)) {
      return options.fallback ?? "--";
    }
    const absolute = Math.abs(number);
    const lastTwo = absolute % 100;
    let suffix = "th";
    if (lastTwo < 11 || lastTwo > 13) {
      switch (absolute % 10) {
        case 1:
          suffix = "st";
          break;
        case 2:
          suffix = "nd";
          break;
        case 3:
          suffix = "rd";
          break;
      }
    }
    return `${number}${suffix}`;
  }
  function formatRating(value, options = {}) {
    const rating = toNumber(value, NaN);
    if (!Number.isFinite(rating)) {
      return options.fallback ?? "--";
    }
    const maximum = Math.max(1, toNumber(options.maximum, 5));
    const clamped = Math.max(0, Math.min(maximum, rating));
    return `${clamped.toFixed(options.decimals ?? 1)}/${maximum}`;
  }
  function formatList(value, options = {}) {
    const items = Array.isArray(value)
      ? value.filter(item => item !== null && item !== undefined && item !== "")
      : [];
    if (!items.length) return options.fallback ?? "--";
    try {
      return new Intl.ListFormat(options.locale || DEFAULT_LOCALE, {
        style: options.style || "long",
        type: options.type || "conjunction"
      }).format(items.map(String));
    } catch {
      return items.join(", ");
    }
  }
  function formatBoolean(value, options = {}) {
    if (value === true) return options.yes || "Yes";
    if (value === false) return options.no || "No";
    return options.fallback ?? "--";
  }
  function formatRange(minimum, maximum, options = {}) {
    const min = toNumber(minimum, NaN);
    const max = toNumber(maximum, NaN);
    const formatter = options.formatter || formatNumber;
    if (!Number.isFinite(min) && !Number.isFinite(max)) {
      return options.fallback ?? "--";
    }
    if (!Number.isFinite(min)) {
      return `${options.prefixMax || "Up to "}${formatter(max, options)}`;
    }
    if (!Number.isFinite(max)) {
      return `${options.prefixMin || "From "}${formatter(min, options)}`;
    }
    if (min === max) return formatter(min, options);
    return `${formatter(min, options)} – ${formatter(max, options)}`;
  }
  function formatDurationRange(minimum, maximum, options = {}) {
    const min = toNumber(minimum, NaN);
    const max = toNumber(maximum, NaN);
    if (!Number.isFinite(min) && !Number.isFinite(max)) {
      return options.fallback ?? "--";
    }
    const unit = options.unit || "years";
    const formatValue = value => {
      const formatted = formatNumber(value, {
        maximumFractionDigits: options.maximumFractionDigits ?? 1
      });
      return `${formatted} ${unit}`;
    };
    if (!Number.isFinite(min)) return `Up to ${formatValue(max)}`;
    if (!Number.isFinite(max)) return `From ${formatValue(min)}`;
    if (min === max) return formatValue(min);
    return `${formatValue(min)} – ${formatValue(max)}`;
  }
  function formatValue(value, options = {}) {
    if (value === null || value === undefined || value === "") {
      return options.fallback ?? "--";
    }
    switch (options.type) {
      case "currency":
        return formatCurrency(value, options);
      case "compactCurrency":
        return formatCompactCurrency(value, options);
      case "number":
        return formatNumber(value, options);
      case "compactNumber":
        return formatCompactNumber(value, options);
      case "percentage":
        return formatPercentage(value, options);
      case "date":
        return formatDate(value, options);
      case "datetime":
        return formatDateTime(value, options);
      case "time":
        return formatTime(value, options);
      case "relativeDate":
        return formatRelativeDate(value, options);
      case "fileSize":
        return formatFileSize(value, options);
      case "phone":
        return formatPhone(value, options);
      case "status":
        return formatStatus(value, options);
      case "boolean":
        return formatBoolean(value, options);
      case "rating":
        return formatRating(value, options);
      default:
        return String(value);
    }
  }
  const api = {
    DEFAULT_LOCALE,
    DEFAULT_CURRENCY,
    toNumber,
    toDate,
    formatCurrency,
    formatCompactCurrency,
    formatNumber,
    formatCompactNumber,
    formatPercentage,
    formatDate,
    formatDateTime,
    formatTime,
    formatRelativeDate,
    formatDateRange,
    formatDuration,
    formatFileSize,
    truncateText,
    capitalize,
    titleCase,
    sentenceCase,
    slugify,
    formatPhone,
    maskEmail,
    maskPhone,
    formatName,
    formatAddress,
    formatStatus,
    formatOrdinal,
    formatRating,
    formatList,
    formatBoolean,
    formatRange,
    formatDurationRange,
    formatValue
  };
  window.MedOrbitsFormatters = api;
})(window);