import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Project, CreateProjectPayload, UpdateProjectPayload, ProjectStatus } from "@/types";

const schema = z.object({
  name: z.string().min(1),
  status: z.enum(["active", "paused", "completed"]),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  onCreate: (data: CreateProjectPayload) => void;
  onUpdate: (data: UpdateProjectPayload) => void;
  loading?: boolean;
}

const STATUSES: ProjectStatus[] = ["active", "paused", "completed"];

export function ProjectFormDialog({
  open, onOpenChange, project, onCreate, onUpdate, loading,
}: ProjectFormDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!project;

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", status: "active", start_date: "", end_date: "", description: "" },
  });

  useEffect(() => {
    if (!open) return;
    if (project) {
      reset({
        name:        project.name,
        status:      project.status as ProjectStatus,
        start_date:  project.start_date ?? "",
        end_date:    project.end_date   ?? "",
        description: project.description ?? "",
      });
    } else {
      reset({ name: "", status: "active", start_date: "", end_date: "", description: "" });
    }
  }, [open, project, reset]);

  const onValid = (values: FormValues) => {
    if (isEditing) {
      onUpdate({
        name:        values.name,
        status:      values.status as ProjectStatus,
        start_date:  values.start_date || null,
        end_date:    values.end_date   || null,
        description: values.description || null,
      });
    } else {
      onCreate({
        name:        values.name,
        status:      values.status,
        start_date:  values.start_date || undefined,
        end_date:    values.end_date   || undefined,
        description: values.description || undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("projects.editProject") : t("projects.newProject")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-name">{t("projects.fields.name")} *</Label>
            <Input id="proj-name" {...register("name")} placeholder="e.g. 電商平台改版" autoFocus />
            {errors.name && (
              <p className="text-xs text-danger">{t("projects.fields.nameRequired")}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("projects.fields.status")}</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`projects.status.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-start">{t("projects.fields.startDate")}</Label>
              <Input id="proj-start" type="date" {...register("start_date")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-end">{t("projects.fields.endDate")}</Label>
              <Input id="proj-end" type="date" {...register("end_date")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-desc">{t("projects.fields.description")}</Label>
            <Textarea
              id="proj-desc"
              {...register("description")}
              rows={2}
              placeholder={t("projects.fields.descriptionPlaceholder")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.loading") : isEditing ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
