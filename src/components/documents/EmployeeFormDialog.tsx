import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Employee, CreateEmployeePayload } from "@/types";

const schema = z.object({
  name:       z.string().min(1, "姓名必填"),
  email:      z.string().optional(),
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
          <DialogTitle>{employee ? "編輯員工" : "新增員工"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onValid)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>姓名 *</Label>
            <Input {...register("name")} className={errors.name ? "border-danger" : ""} />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" placeholder="name@company.com" {...register("email")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>分機</Label>
              <Input placeholder="1234" {...register("extension")} />
            </div>
            <div className="space-y-1.5">
              <Label>部門</Label>
              <Input placeholder="工程部" {...register("department")} />
            </div>
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
