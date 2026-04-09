import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatEventDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatPrice(amount?: number | null) {
  if (amount == null) return null;

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatCompactNumber(value?: number | null) {
  if (value == null) return "0";

  return new Intl.NumberFormat("es-ES", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercentage(value?: number | null, digits = 1) {
  if (value == null || Number.isNaN(value)) return "0%";
  return `${value.toFixed(digits)}%`;
}

export function formatShortDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}
