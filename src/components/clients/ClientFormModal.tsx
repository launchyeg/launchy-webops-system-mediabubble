import { type FormEvent, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { createClient, updateClient } from "@/services/clients.service";
import type { ClientRow } from "@/types";

interface ClientFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: ClientRow | null;
}

const EMPTY_FORM = {
  client_name: "",
  agency_name: "",
  email: "",
  phone: "",
  start_project_date: "",
  notes: "",
};

export function ClientFormModal({
  open,
  onClose,
  onSuccess,
  client,
}: ClientFormModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(client);

  useEffect(() => {
    if (!open) return;
    setForm(
      client
        ? {
            client_name: client.client_name,
            agency_name: client.agency_name ?? "",
            email: client.email ?? "",
            phone: client.phone ?? "",
            start_project_date: client.start_project_date ?? "",
            notes: client.notes ?? "",
          }
        : EMPTY_FORM
    );
  }, [client, open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        client_name: form.client_name.trim(),
        agency_name: form.agency_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        start_project_date: form.start_project_date || null,
        notes: form.notes.trim() || null,
      };
      if (isEdit && client) {
        await updateClient(client.id, payload);
        toast({ title: "Client updated", variant: "success" });
      } else {
        await createClient(payload);
        toast({ title: "Client added", variant: "success" });
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Client" : "Add Client"}
      description={isEdit ? "Update this client's information." : "Create a new client record."}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Client Name"
          required
          value={form.client_name}
          onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
        />
        <Input
          label="Agency Name"
          value={form.agency_name}
          onChange={(e) => setForm((f) => ({ ...f, agency_name: e.target.value }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Client Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Client Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <Input
          label="Start Project Date"
          type="date"
          hint="The date mediaBubble started working with this client."
          value={form.start_project_date}
          onChange={(e) =>
            setForm((f) => ({ ...f, start_project_date: e.target.value }))
          }
        />
        <Textarea
          label="Notes"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? "Save Changes" : "Add Client"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
