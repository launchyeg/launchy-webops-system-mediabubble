import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";

interface ProviderSelectProps {
  presets: readonly string[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

/**
 * A provider dropdown seeded with common presets that reveals a free-text
 * field when "Other" is chosen — so new providers can always be recorded
 * without any code changes, while keeping data entry fast for the common
 * case.
 */
export function ProviderSelect({
  presets,
  value,
  onChange,
  label = "Provider",
  required,
}: ProviderSelectProps) {
  const isCustom = value !== "" && !presets.includes(value);
  const selectValue = isCustom ? "Other" : value;

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        label={label}
        required={required}
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next === "Other" ? "" : next);
        }}
      >
        <option value="" disabled>
          Select a provider…
        </option>
        {presets.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Select>
      {selectValue === "Other" && (
        <Input
          placeholder="Enter provider name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}
    </div>
  );
}
