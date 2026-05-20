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
import type { Meeting, CreateMeetingPayload } from "@/types";

const schema = z.object({
  title:      z.string().min(1, "meetings.fields.titleRequired"),
  meeting_date: z.string().optional(),
  attendees:  z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting?: Meeting | null;
  onSubmit: (payload: CreateMeetingPayload) => void;
  isPending?: boolean;
}

export function MeetingFormDialog({ open, onOpenChange, meeting, onSubmit, isPending }: Props) {
  const { t } = useTranslation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", meeting_date: "", attendees: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        title:        meeting?.title        ?? "",
        meeting_date: meeting?.meeting_date ?? "",
        attendees:    meeting?.attendees    ?? "",
      });
    }
  }, [open, meeting, reset]);

  const onValid = (values: FormValues) => {
    onSubmit({
      title:        values.title,
      meeting_date: values.meeting_date || null,
      attendees:    values.attendees    || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{meeting ? t("meetings.edit") : t("meetings.new")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onValid)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("meetings.fields.title")} *</Label>
            <Input {...register("title")} className={errors.title ? "border-danger" : ""} autoFocus />
            {errors.title && (
              <p className="text-xs text-danger">{t(errors.title.message ?? "meetings.fields.titleRequired")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("meetings.fields.date")}</Label>
            <Input type="date" {...register("meeting_date")} />
          </div>

          <div className="space-y-1.5">
            <Label>{t("meetings.fields.attendees")}</Label>
            <Input placeholder="張小明, 李大華..." {...register("attendees")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
