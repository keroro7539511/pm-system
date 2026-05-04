import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects } from "@/hooks/useProjects";
import type { Contact, CreateContactPayload } from "@/types";

const schema = z.object({
  name:            z.string().min(1, "姓名必填"),
  email:           z.string().optional(),
  phone:           z.string().optional(),
  company_name:    z.string().optional(),
  company_address: z.string().optional(),
  project_id:      z.string().optional(),
  notes:           z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  onSubmit: (payload: CreateContactPayload) => void;
  isPending?: boolean;
}

export function ContactFormDialog({ open, onOpenChange, contact, onSubmit, isPending }: Props) {
  const { data: projects = [] } = useProjects();

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", company_name: "", company_address: "", project_id: "none", notes: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name:            contact?.name ?? "",
        email:           contact?.email ?? "",
        phone:           contact?.phone ?? "",
        company_name:    contact?.company_name ?? "",
        company_address: contact?.company_address ?? "",
        project_id:      contact?.project_id ? String(contact.project_id) : "none",
        notes:           contact?.notes ?? "",
      });
    }
  }, [open, contact, reset]);

  const onValid = (values: FormValues) => {
    onSubmit({
      name:            values.name,
      email:           values.email || null,
      phone:           values.phone || null,
      company_name:    values.company_name || null,
      company_address: values.company_address || null,
      project_id:      values.project_id && values.project_id !== "none" ? Number(values.project_id) : null,
      notes:           values.notes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{contact ? "編輯客戶窗口" : "新增客戶窗口"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onValid)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>姓名 *</Label>
            <Input {...register("name")} className={errors.name ? "border-danger" : ""} />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="name@company.com" {...register("email")} />
            </div>
            <div className="space-y-1.5">
              <Label>電話</Label>
              <Input placeholder="0912-345-678" {...register("phone")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>公司名稱</Label>
            <Input placeholder="ABC 科技有限公司" {...register("company_name")} />
          </div>

          <div className="space-y-1.5">
            <Label>公司地址</Label>
            <Input placeholder="台北市信義區..." {...register("company_address")} />
          </div>

          <div className="space-y-1.5">
            <Label>關聯專案</Label>
            <Controller
              control={control}
              name="project_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="（選填）" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— 不指定 —</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>備註</Label>
            <Textarea rows={3} placeholder="其他備注..." {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
