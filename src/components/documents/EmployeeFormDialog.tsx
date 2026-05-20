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
import type { Employee, CreateEmployeePayload } from "@/types";

const schema = z.object({
  name:       z.string().min(1, "employees.fields.nameRequired"),
  email:      z.string().email("contacts.fields.emailInvalid").or(z.literal("")).optional(),
  extension:  z.string().optional(),
  department: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  onSubmit: (payload: CreateEmployeePayload) => void;
  isPending?: boolean;
}

export function EmployeeFormDialog({ open, onOpenChange, employee, onSubmit, isPending }: Props) {
  const { t } = useTranslation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", extension: "", department: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name:       employee?.name ?? "",
        email:      employee?.email ?? "",
        extension:  employee?.extension ?? "",
        department: employee?.department ?? "",
      });
    }
  }, [open, employee, reset]);

  const onValid = (values: FormValues) => {
    onSubmit({
      name:       values.name,
      email:      values.email || null,
      extension:  values.extension || null,
      department: values.department || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{employee ? t("employees.edit") : t("employees.new")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onValid)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("employees.fields.name")} *</Label>
            <Input {...register("name")} className={errors.name ? "border-danger" : ""} />
            {errors.name && <p className="text-xs text-danger">{t(errors.name.message ?? "employees.fields.nameRequired")}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>{t("employees.fields.email")}</Label>
            <Input type="email" placeholder="name@company.com" {...register("email")}
              className={errors.email ? "border-danger" : ""} />
            {errors.email && <p className="text-xs text-danger">{t(errors.email.message ?? "contacts.fields.emailInvalid")}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("employees.fields.extension")}</Label>
              <Input placeholder="1234" {...register("extension")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("employees.fields.department")}</Label>
              <Input placeholder="工程部" {...register("department")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
