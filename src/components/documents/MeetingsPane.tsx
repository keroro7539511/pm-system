import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Video, Plus, Search, Trash2, Edit3, Sparkles, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "@/stores/toastStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "@/lib/tauri";
import { vttToText } from "@/lib/vtt";
import { MeetingFormDialog } from "./MeetingFormDialog";
import {
  useMeetings, useCreateMeeting, useUpdateMeeting, useDeleteMeeting,
  useActionItems, useSaveActionItems, useLinkActionItemTask,
} from "@/hooks/useMeetings";
import { useCreateTask } from "@/hooks/useTasks";
import type { Meeting, CreateMeetingPayload, ActionItem } from "@/types";

// ── Transcript renderer ─────────────────────────────────────────────────────

function TranscriptLine({ line }: { line: string }) {
  const match = line.match(/^\[(\d{2}:\d{2}:\d{2})\] ([^：]+)：(.+)$/);
  if (match) {
    return (
      <div className="flex items-start gap-2 py-1">
        <span className="text-[10px] text-text-muted mt-0.5 shrink-0 w-14">{match[1]}</span>
        <span className="text-xs font-medium text-primary shrink-0 min-w-[4rem]">{match[2]}</span>
        <span className="text-sm text-text-secondary leading-relaxed">{match[3]}</span>
      </div>
    );
  }
  return <p className="text-sm text-text-secondary py-0.5 pl-[4.5rem]">{line}</p>;
}

// ── Action item row ─────────────────────────────────────────────────────────

function ActionItemRow({
  item,
  onConvert,
  isConverting,
}: {
  item: ActionItem;
  onConvert: () => void;
  isConverting: boolean;
}) {
  const { t } = useTranslation();
  const isDone = item.task_id !== null;

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border",
      isDone ? "border-success/20 bg-success/5" : "border-border bg-layer-2"
    )}>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", isDone && "line-through text-text-muted")}>
          {item.description}
        </p>
        <div className="flex items-center gap-3 mt-1">
          {item.assignee && (
            <span className="text-xs text-text-muted">{item.assignee}</span>
          )}
          {item.due_date && (
            <span className="text-xs text-text-muted">{item.due_date}</span>
          )}
        </div>
      </div>
      {isDone ? (
        <span className="flex items-center gap-1 text-xs text-success shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />{t("meetings.taskCreated")}
        </span>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={onConvert}
          disabled={isConverting}
          className="text-xs shrink-0 h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
        >
          {t("meetings.convertToTask")}
        </Button>
      )}
    </div>
  );
}

// ── Main pane ────────────────────────────────────────────────────────────────

export function MeetingsPane() {
  const { t } = useTranslation();
  const [selected, setSelected]     = useState<Meeting | null>(null);
  const [detailTab, setDetailTab]   = useState<"transcript" | "summary">("transcript");
  const [formOpen, setFormOpen]     = useState(false);
  const [editing, setEditing]       = useState<Meeting | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [search, setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [aiLoading, setAiLoading]   = useState(false);
  const [convertingId, setConvertingId] = useState<number | null>(null);

  const vttInputRef = useRef<HTMLInputElement>(null);

  const { data: meetings = [], isLoading } = useMeetings(debouncedSearch || undefined);
  const createMeeting  = useCreateMeeting();
  const updateMeeting  = useUpdateMeeting();
  const deleteMeeting  = useDeleteMeeting();
  const { data: actionItems = [] } = useActionItems(selected?.id);
  const saveActionItems   = useSaveActionItems();
  const linkActionItem    = useLinkActionItemTask();
  const createTask        = useCreateTask();

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Keep selected in sync after mutations
  useEffect(() => {
    if (selected) {
      const fresh = meetings.find((m) => m.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [meetings]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(payload: CreateMeetingPayload) {
    if (editing) {
      updateMeeting.mutate({ id: editing.id, payload }, {
        onSuccess: (updated) => { setSelected(updated); setFormOpen(false); setEditing(null); },
      });
    } else {
      createMeeting.mutate(payload, {
        onSuccess: (created) => { setSelected(created); setFormOpen(false); },
      });
    }
  }

  function handleDelete() {
    if (!selected) return;
    deleteMeeting.mutate(selected.id, {
      onSuccess: () => {
        setSelected(null);
        setDeleteConfirm(false);
        toast(t("meetings.deleted"), "success");
      },
    });
  }

  const handleVttFile = useCallback((file: File) => {
    if (!selected) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const text = vttToText(content);
      updateMeeting.mutate(
        { id: selected.id, payload: { transcript: text } },
        { onSuccess: (updated) => setSelected(updated) }
      );
    };
    reader.readAsText(file, "utf-8");
  }, [selected, updateMeeting]);

  const handleAiSummarize = useCallback(async () => {
    if (!selected?.transcript) return;
    setAiLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const result = await api.ai.summarizeTranscript(selected.transcript, today);

      // Save summary to meeting
      const updated = await api.meetings.update(selected.id, { ai_summary: result.summary });
      setSelected(updated);

      // Save action items
      await api.meetings.saveActionItems(
        selected.id,
        result.action_items.filter((a) => a.description)
      );
      saveActionItems.mutate({ meetingId: selected.id, items: result.action_items });

      setDetailTab("summary");
      toast("摘要已產生", "success");
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setAiLoading(false);
    }
  }, [selected, saveActionItems]);

  const handleConvertToTask = useCallback((item: ActionItem) => {
    if (!selected) return;
    setConvertingId(item.id);
    createTask.mutate(
      {
        title:      item.description,
        assignee:   item.assignee ?? undefined,
        due_date:   item.due_date ?? undefined,
        priority:   "P2",
        status:     "todo",
      },
      {
        onSuccess: (task) => {
          linkActionItem.mutate(
            { actionItemId: item.id, taskId: task.id, meetingId: selected.id },
            {
              onSuccess: () => toast(t("meetings.taskCreated"), "success"),
              onSettled: () => setConvertingId(null),
            }
          );
        },
        onError: () => setConvertingId(null),
      }
    );
  }, [selected, createTask, linkActionItem, t]);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col bg-sidebar">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold text-text-primary shrink-0">{t("meetings.title")}</h1>
            <Button
              size="sm"
              onClick={() => { setEditing(null); setFormOpen(true); }}
              className="h-7 px-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />{t("common.add")}
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-text-muted" />
            <Input
              placeholder={t("meetings.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <p className="text-sm text-text-muted p-3">{t("common.loading")}</p>
          ) : meetings.length === 0 ? (
            <div className="p-4 text-center">
              <Video className="h-10 w-10 mx-auto text-text-muted mb-2" />
              <p className="text-sm text-text-muted">{t("meetings.noMeetings")}</p>
              <p className="text-xs text-text-muted mt-1">{t("meetings.noMeetingsDesc")}</p>
            </div>
          ) : (
            meetings.map((m) => (
              <button
                key={m.id}
                onClick={() => { setSelected(m); setDeleteConfirm(false); setDetailTab("transcript"); }}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                  selected?.id === m.id
                    ? "bg-primary/15 text-text-primary"
                    : "text-text-secondary hover:bg-layer-2"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{m.title}</p>
                  {m.ai_summary && (
                    <Sparkles className="h-3 w-3 text-warning shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {m.meeting_date && (
                    <span className="text-xs text-text-muted">{m.meeting_date}</span>
                  )}
                  {m.transcript && (
                    <span className="text-[10px] text-text-muted bg-layer-3 px-1.5 py-0.5 rounded">
                      VTT
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-border bg-card-bg shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{selected.title}</h2>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                  {selected.meeting_date && <span>{selected.meeting_date}</span>}
                  {selected.attendees && <span>{selected.attendees}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm" variant="ghost"
                  onClick={() => { setEditing(selected); setFormOpen(true); }}
                  className="text-xs gap-1.5"
                >
                  <Edit3 className="h-3.5 w-3.5" />{t("common.edit")}
                </Button>
                {deleteConfirm ? (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="destructive" onClick={handleDelete}
                      disabled={deleteMeeting.isPending} className="text-xs h-7">
                      {t("common.deleteConfirmBtn")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(false)}
                      className="text-xs h-7">{t("common.cancel")}
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(true)}
                    className="text-xs gap-1.5 text-danger hover:text-danger hover:bg-danger/10">
                    <Trash2 className="h-3.5 w-3.5" />{t("common.delete")}
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 py-2 border-b border-border shrink-0 bg-sidebar">
              {(["transcript", "summary"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-medium transition-colors",
                    detailTab === tab
                      ? "bg-layer-3 text-text-primary"
                      : "text-text-muted hover:text-text-secondary"
                  )}
                >
                  {t(`meetings.${tab}`)}
                </button>
              ))}
            </div>

            {/* Transcript tab */}
            {detailTab === "transcript" && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-6 py-3 border-b border-border shrink-0">
                  <input
                    ref={vttInputRef}
                    type="file"
                    accept=".vtt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleVttFile(f);
                      if (vttInputRef.current) vttInputRef.current.value = "";
                    }}
                  />
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => vttInputRef.current?.click()}
                    className="text-xs gap-1.5"
                    disabled={updateMeeting.isPending}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {selected.transcript ? t("meetings.reimportVtt") : t("meetings.importVtt")}
                  </Button>
                  {selected.transcript && (
                    <Button
                      size="sm" variant="ghost"
                      onClick={handleAiSummarize}
                      disabled={aiLoading}
                      className="text-xs gap-1.5 text-warning hover:text-warning hover:bg-warning/10"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {aiLoading ? t("meetings.aiSummarizing") : t("meetings.aiSummarize")}
                    </Button>
                  )}
                </div>

                {selected.transcript ? (
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="space-y-0.5">
                      {selected.transcript.split('\n').map((line, i) => (
                        <TranscriptLine key={i} line={line} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-2">
                    <Upload className="h-12 w-12 opacity-20" />
                    <p className="text-base">{t("meetings.noTranscript")}</p>
                    <p className="text-sm text-center max-w-xs">{t("meetings.noTranscriptDesc")}</p>
                  </div>
                )}
              </div>
            )}

            {/* Summary tab */}
            {detailTab === "summary" && (
              <div className="flex-1 overflow-y-auto p-6">
                {selected.ai_summary ? (
                  <div className="max-w-2xl space-y-6">
                    {/* Summary text */}
                    <div className="p-4 rounded-lg bg-layer-2 border border-border">
                      <p className="text-xs text-text-muted mb-2 font-medium uppercase tracking-wider">
                        {t("meetings.summary").split(" & ")[0]}
                      </p>
                      <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                        {selected.ai_summary}
                      </p>
                    </div>

                    {/* Action items */}
                    <div>
                      <p className="text-xs text-text-muted mb-3 font-medium uppercase tracking-wider">
                        {t("meetings.actionItems")}
                      </p>
                      {actionItems.length === 0 ? (
                        <p className="text-sm text-text-muted">{t("meetings.noActionItems")}</p>
                      ) : (
                        <div className="space-y-2">
                          {actionItems.map((item) => (
                            <ActionItemRow
                              key={item.id}
                              item={item}
                              onConvert={() => handleConvertToTask(item)}
                              isConverting={convertingId === item.id}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
                    <Sparkles className="h-12 w-12 opacity-20" />
                    <p className="text-base">{t("meetings.noSummary")}</p>
                    <p className="text-sm text-center max-w-xs">{t("meetings.noSummaryDesc")}</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <Video className="h-20 w-20 mb-4 opacity-20" />
            <p className="text-lg">{t("meetings.selectPrompt")}</p>
            <p className="text-sm mt-1">{t("meetings.orAdd")}</p>
          </div>
        )}
      </div>

      <MeetingFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        meeting={editing}
        onSubmit={handleSubmit}
        isPending={createMeeting.isPending || updateMeeting.isPending}
      />
    </div>
  );
}
