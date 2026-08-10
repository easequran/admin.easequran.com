import { Select } from "@/components/ui/input";
import { CURRENCY_OPTIONS } from "@/lib/utils/currency";

export function CurrencySelect({
  id,
  name,
  defaultValue,
  required,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <Select id={id} name={name} defaultValue={defaultValue ?? "USD"} required={required}>
      {CURRENCY_OPTIONS.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.code} — {c.label}
        </option>
      ))}
    </Select>
  );
}
