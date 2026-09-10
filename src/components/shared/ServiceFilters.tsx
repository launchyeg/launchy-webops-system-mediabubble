import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { ClientRow } from "@/types";

export type SortDirection = "asc" | "desc";
export type StatusFilterValue = "all" | "active" | "soon" | "warning" | "urgent" | "expired";

interface ServiceFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder: string;

  clientFilter: string;
  onClientFilterChange: (v: string) => void;
  clients: Pick<ClientRow, "id" | "client_name">[];

  providerFilter: string;
  onProviderFilterChange: (v: string) => void;
  providers: string[];

  statusFilter: StatusFilterValue;
  onStatusFilterChange: (v: StatusFilterValue) => void;

  sortDirection: SortDirection;
  onToggleSort: () => void;
}

export function ServiceFilters(props: ServiceFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <SearchInput
        value={props.search}
        onChange={props.onSearchChange}
        placeholder={props.searchPlaceholder}
        className="sm:w-64"
      />
      <Select
        value={props.clientFilter}
        onChange={(e) => props.onClientFilterChange(e.target.value)}
        className="sm:w-44"
        aria-label="Filter by client"
      >
        <option value="">All Clients</option>
        {props.clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.client_name}
          </option>
        ))}
      </Select>
      <Select
        value={props.providerFilter}
        onChange={(e) => props.onProviderFilterChange(e.target.value)}
        className="sm:w-44"
        aria-label="Filter by provider"
      >
        <option value="">All Providers</option>
        {props.providers.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Select>
      <Select
        value={props.statusFilter}
        onChange={(e) => props.onStatusFilterChange(e.target.value as StatusFilterValue)}
        className="sm:w-44"
        aria-label="Filter by status"
      >
        <option value="all">All Statuses</option>
        <option value="active">Active</option>
        <option value="soon">Renewing Soon</option>
        <option value="warning">Urgent (14d)</option>
        <option value="urgent">Urgent (7d)</option>
        <option value="expired">Expired</option>
      </Select>
      <Button variant="outline" size="sm" onClick={props.onToggleSort} className="ml-auto">
        {props.sortDirection === "asc" ? (
          <ArrowUpAZ className="h-4 w-4" />
        ) : (
          <ArrowDownAZ className="h-4 w-4" />
        )}
        Expiration Date
      </Button>
    </div>
  );
}
