import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Document, CreateDocumentPayload } from "@/types";

const schema = z.object({
  name: z.string().min(1),
  doc_type: z.string().optional(),
  version: z.string().optional(),
  expires_at: z.string().optional(),
  content_md: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc?: Document | null;
  onSubmit: (payload: CreateDocumentPayload) => void;
  isPending?: boolean;
}

const DOC_TYPES = ["contract", "proposal", "report", "spec", "other"];

const nativeSelectClass =
  "flex h-9 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary";

export function DocumentFormDialog({ open, onOpenChange, doc, onSubmit, isPending }: Props) {
  const { t } = useTranslation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", doc_type: "", version: "", expires_at: "", content_md: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: doc?.name ?? "",
        doc_type: doc?.doc_type ?? "",
        version: doc?.version ?? "",
        expires_at: doc?.expires_at ?? "",
        content_md: doc?.content_md ?? "",
      });
    }
  }, [open, doc, reset]);

  const onValid = (values: FormValues) => {
    onSubmit({
      name: values.name,
      doc_type: values.doc_type || undefined,
      version: values.version || undefined,
      expires_at: values.expires_at || undefined,
      content_md: values.content_md || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {doc ? t("documents.edit") : t("documents.new")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onValid)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="doc-name">{t("documents.fields.name")} *</Label>
            <Input
              id="doc-name"
              {...register("name")}
              className={errors.name ? "border-red-500" : ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="doc-type">{t("documents.fields.type")}</Label>
              <select id="doc-type" className={nativeSelectClass} {...register("doc_type")}>
                <option value="">—</option>
                {DOC_TYPES.map(dt => (
                  <option key={dt} value={dt}>
                    {t(`documents.types.${dt}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-version">{t("documents.fields.version")}</Label>
              <Input id="doc-version" placeholder="v1.0" {...register("version")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-expires">{t("documents.fields.expiresAt")}</Label>
            <Input id="doc-expires" type="date" {...register("expires_at")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-content">{t("documents.fields.content")}</Label>
            <Textarea
              id="doc-content"
              rows={8}
              className="font-mono text-sm"
              placeholder={"# 文件標題\n\n內容..."}
              {...register("content_md")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
