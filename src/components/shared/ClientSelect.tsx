import { Select } from "@/components/ui/Select";
import type { ClientRow } from "@/types";

interface ClientSelectProps {
  clients: Pick<ClientRow, "id" | "client_name">[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  includeUnassigned?: boolean;
}

export function ClientSelect({
  clients,
  value,
  onChange,
  label = "Client",
  required,
  includeUnassigned = true,
}: ClientSelectProps) {
  return (
    <Select
      label={label}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {includeUnassigned && <option value="">Unassigned</option>}
      {!includeUnassigned && (
        <option value="" disabled>
          Select a client…
        </option>
      )}
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.client_name}
        </option>
      ))}
    </Select>
  );
}
