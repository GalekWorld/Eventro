import { SPANISH_CITIES } from "@/lib/spanish-cities";
import type { ChangeEventHandler } from "react";

export function CitySelect({
  name,
  defaultValue,
  value,
  onChange,
  className = "app-input",
  emptyLabel,
}: {
  name: string;
  defaultValue?: string | null;
  value?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  className?: string;
  emptyLabel: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} value={value} onChange={onChange} className={className}>
      <option value="">{emptyLabel}</option>
      {SPANISH_CITIES.map((city) => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </select>
  );
}
