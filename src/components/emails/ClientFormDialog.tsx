import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Client, CreateClientPayload } from "@/types";

const schema = z.object({
  name: z.string().min(1, "客戶名稱不能為空"),
  contact_person: z.string().optional(),
  email: z.string().email("請輸入有效 Email").optional().or(z.literal("")),
  phone: z.string().optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
  onSubmit: (data: CreateClientPayload) => void;
  loading?: boolean;
}

export function ClientFormDialog({ open, onOpenChange, client, onSubmit, loading }: ClientFormDialogProps) {
  const { t } = useTranslation();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    form.reset(client ? {
      name: client.name,
      contact_person: client.contact_person ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      industry: client.industry ?? "",
      notes: client.notes ?? "",
    } : { name: "", contact_person: "", email: "", phone: "", industry: "", notes: "" });
  }, [client, open]);

  const handleSubmit = form.handleSubmit((v) => {
    onSubmit({
      name: v.name,
      contact_person: v.contact_person || undefined,
      email: v.email || undefined,
      phone: v.phone || undefined,
      industry: v.industry || undefined,
      notes: v.notes || undefined,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{client ? "編輯客戶" : "新增客戶"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>客戶名稱 *</Label>
            <Input {...form.register("name")} placeholder="例：台灣科技股份有限公司" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>聯絡人</Label>
              <Input {...form.register("contact_person")} placeholder="王小明" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>電話</Label>
              <Input {...form.register("phone")} placeholder="02-1234-5678" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input {...form.register("email")} placeholder="contact@company.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>產業</Label>
            <Input {...form.register("industry")} placeholder="製造業、科技業..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>備註</Label>
            <Textarea {...form.register("notes")} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.loading") : client ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
