import { SPANISH_CITIES } from "@/lib/spanish-cities";

export function CitySelect({
  name,
  defaultValue,
  className = "app-input",
  emptyLabel,
}: {
  name: string;
  defaultValue?: string | null;
  className?: string;
  emptyLabel: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className={className}>
      <option value="">{emptyLabel}</option>
      {SPANISH_CITIES.map((city) => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </select>
  );
}
