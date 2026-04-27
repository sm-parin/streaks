"use client";
import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  type Task, type List, type Priority, type DayOfWeek,
  PRIORITY_COLORS, PRIORITY_NAMES, DAY_LABELS,
} from "@/lib/types";
import { useTags } from "@/lib/hooks/use-tags";
import { usePush } from "@/lib/hooks/use-push";

// ── Types ──────────────────────────────────────────────────────────────────

export type RCMMode = "create" | "edit" | "info";

interface RCMPrefill {
  assignee_user_id?: string;
  group_id?: string;
  list_id?: string;
}

interface RCMProps {
  open: boolean;
  onClose: () => void;
  mode?: RCMMode;
  initialKind?: "task" | "list";
  task?: Task;
  list?: List & { tasks?: Task[] };
  prefill?: RCMPrefill;
  onSave?: () => void;
  userLists?: Array<List>;
}

// ── Step IDs ───────────────────────────────────────────────────────────────

const TASK_STEPS = ["Info", "Schedule", "Organize", "Add to List", "Social"] as const;
const LIST_STEPS = ["Info", "Add Tasks"] as const;
const INFO_STEPS = ["Overview", "Details"] as const;

// ── Default state ──────────────────────────────────────────────────────────

function defaultState(
  mode: RCMMode,
  kind: "task" | "list",
  task?: Task,
  list?: List,
  prefill?: RCMPrefill
) {
  if (mode === "info") {
    return {
      kind,
      title: task?.title ?? list?.title ?? "",
      description: task?.description ?? "",
      isRecurring: task?.is_recurring ?? false,
      activeDays: task?.active_days ?? ([] as DayOfWeek[]),
      specificDate: task?.specific_date ?? "",
      timeFrom: task?.time_from ?? "",
      timeTo: task?.time_to ?? "",
      priority: (task?.priority ?? 3) as Priority,
      tagIds: task?.tag_ids ?? list?.tag_ids ?? [],
      listId: task?.list_id ?? null,
      assigneeUserId: task?.assignee_user_id ?? prefill?.assignee_user_id ?? null,
      groupId: task?.group_id ?? prefill?.group_id ?? null,
      selectedTaskIds: [] as string[],
    };
  }
  if (mode === "edit" && task) {
    return {
      kind: "task" as const,
      title: task.title,
      description: task.description ?? "",
      isRecurring: task.is_recurring,
      activeDays: task.active_days as DayOfWeek[],
      specificDate: task.specific_date ?? "",
      timeFrom: task.time_from ?? "",
      timeTo: task.time_to ?? "",
      priority: task.priority,
      tagIds: task.tag_ids,
      listId: task.list_id,
      assigneeUserId: task.assignee_user_id,
      groupId: task.group_id,
      selectedTaskIds: [] as string[],
    };
  }
  if (mode === "edit" && list) {
    return {
      kind: "list" as const,
      title: list.title,
      description: "",
      isRecurring: false,
      activeDays: [] as DayOfWeek[],
      specificDate: "",
      timeFrom: "",
      timeTo: "",
      priority: 3 as Priority,
      tagIds: [],
      listId: null,
      assigneeUserId: null,
      groupId: null,
      selectedTaskIds: ((list as List & { tasks?: Task[] }).tasks ?? []).map((t) => t.id),
    };
  }
  // create defaults
  return {
    kind,
    title: "",
    description: "",
    isRecurring: true,
    activeDays: [] as DayOfWeek[],
    specificDate: "",
    timeFrom: "",
    timeTo: "",
    priority: 3 as Priority,
    tagIds: [],
    listId: prefill?.list_id ?? null,
    assigneeUserId: prefill?.assignee_user_id ?? null,
    groupId: prefill?.group_id ?? null,
    selectedTaskIds: [] as string[],
  };
}

// ── Dot nav ────────────────────────────────────────────────────────────────

function DotNav({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-label="Step indicator">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all",
            i === current
              ? "w-4 h-2 bg-[var(--color-brand)]"
              : "w-2 h-2 bg-[var(--color-border-strong)]"
          )}
        />
      ))}
    </div>
  );
}

// ── Main RCM ──────────────────────────────────────────────────────────────

export function RCM({
  open,
  onClose,
  mode = "create",
  initialKind = "task",
  task,
  list,
  prefill,
  onSave,
  userLists = [],
}: RCMProps) {
  const { tags } = useTags();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"right" | "left">("right");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [state, setState] = useState(() =>
    defaultState(mode, initialKind, task, list, prefill)
  );

  useEffect(() => {
    if (open) {
      setStep(0);
      setDir("right");
      setErrors({});
      setState(defaultState(mode, initialKind, task, list, prefill));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initialKind, task?.id, list?.id]);

  if (!open) return null;

  const steps =
    mode === "info"
      ? INFO_STEPS
      : state.kind === "list"
      ? LIST_STEPS
      : TASK_STEPS;

  const isInfo = mode === "info";
  const isLast = step === steps.length - 1;

  const go = (next: number) => {
    setDir(next > step ? "right" : "left");
    setStep(next);
    setErrors({});
  };

  const validate = (): boolean => {
    if (step === 0 && !state.title.trim()) {
      setErrors({ title: "Title is required" });
      return false;
    }
    if (state.kind === "task" && step === 1) {
      if (state.isRecurring && state.activeDays.length === 0) {
        setErrors({ activeDays: "Select at least one day" });
        return false;
      }
      if (!state.isRecurring && !state.specificDate) {
        setErrors({ specificDate: "Please pick a date" });
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (isLast) handleSave();
    else go(step + 1);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const body =
        state.kind === "list"
          ? {
              kind: "list",
              title: state.title.trim(),
              task_ids: state.selectedTaskIds,
            }
          : {
              kind: "task",
              title: state.title.trim(),
              description: state.description || null,
              priority: state.priority,
              tag_ids: state.tagIds,
              is_recurring: state.isRecurring,
              active_days: state.activeDays,
              specific_date: state.isRecurring ? null : state.specificDate || null,
              time_from: state.timeFrom || null,
              time_to: state.timeTo || null,
              list_id: state.listId,
              assignee_user_id: state.assigneeUserId,
              group_id: state.groupId,
            };

      const isEdit = mode === "edit";
      const editId = task?.id ?? list?.id;
      const url = isEdit ? `/api/tasks/${editId}` : "/api/tasks";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        setErrors({ _global: json.error ?? "Failed to save" });
        return;
      }
      onSave?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (d: DayOfWeek) =>
    setState((s) => ({
      ...s,
      activeDays: s.activeDays.includes(d)
        ? s.activeDays.filter((x) => x !== d)
        : [...s.activeDays, d],
    }));

  const toggleTag = (id: string) =>
    setState((s) => ({
      ...s,
      tagIds: s.tagIds.includes(id)
        ? s.tagIds.filter((x) => x !== id)
        : [...s.tagIds, id],
    }));

  // ── Step renderers ──────────────────────────────────────────────────────

  const renderStep = () => {
    const animClass =
      dir === "right" ? "animate-slide-in-right" : "animate-slide-in-left";

    // Info mode
    if (isInfo) {
      if (step === 0) {
        return (
          <div key="info-0" className={animClass}>
            <InfoRow label="Type">{state.kind === "task" ? "Task" : "List"}</InfoRow>
            <InfoRow label="Title">{state.title}</InfoRow>
            {state.description && <InfoRow label="Description">{state.description}</InfoRow>}
            {state.listId && (
              <InfoRow label="List">
                {userLists.find((l) => l.id === state.listId)?.title ?? state.listId}
              </InfoRow>
            )}
          </div>
        );
      }
      if (step === 1) {
        return (
          <div key="info-1" className={animClass}>
            {state.kind === "task" && (
              <>
                <InfoRow label="Recurring">{state.isRecurring ? "Yes" : "No"}</InfoRow>
                {state.isRecurring && (
                  <InfoRow label="Days">
                    {state.activeDays.map((d) => DAY_LABELS[d]).join(", ") || "—"}
                  </InfoRow>
                )}
                {!state.isRecurring && (
                  <InfoRow label="Date">{state.specificDate || "—"}</InfoRow>
                )}
                {state.timeFrom && (
                  <InfoRow label="Time">
                    {state.timeFrom}{state.timeTo ? ` - ${state.timeTo}` : ""}
                  </InfoRow>
                )}
              </>
            )}
            <InfoRow label="Priority">
              <span style={{ color: PRIORITY_COLORS[state.priority] }}>
                P{state.priority} — {PRIORITY_NAMES[state.priority]}
              </span>
            </InfoRow>
            {tags.filter((t) => state.tagIds.includes(t.id)).length > 0 && (
              <InfoRow label="Tags">
                {tags.filter((t) => state.tagIds.includes(t.id)).map((t) => t.name).join(", ")}
              </InfoRow>
            )}
          </div>
        );
      }
    }

    // Task steps
    if (state.kind === "task") {
      if (step === 0) {
        return (
          <div key="t0" className={animClass + " space-y-4"}>
            <KindToggle value={state.kind} onChange={(k) => setState((s) => ({ ...s, kind: k }))} />
            <Field label="Title" error={errors.title}>
              <input
                autoFocus
                type="text"
                maxLength={120}
                value={state.title}
                onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
                placeholder="Task title..."
                className="rcm-input"
              />
            </Field>
            <Field label="Description (optional)">
              <textarea
                rows={3}
                maxLength={500}
                value={state.description}
                onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
                placeholder="What is this task about?"
                className="rcm-input resize-none"
              />
            </Field>
          </div>
        );
      }
      if (step === 1) {
        return (
          <div key="t1" className={animClass + " space-y-4"}>
            <div className="flex gap-2">
              {(["Recurring", "One-off"] as const).map((label) => {
                const isRec = label === "Recurring";
                const active = state.isRecurring === isRec;
                return (
                  <button
                    key={label}
                    onClick={() => setState((s) => ({ ...s, isRecurring: isRec }))}
                    className={cn("flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
                      active
                        ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                        : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {state.isRecurring ? (
              <Field label="Days" error={errors.activeDays}>
                <div className="flex gap-1.5 flex-wrap">
                  {DAY_LABELS.map((d, i) => {
                    const active = state.activeDays.includes(i as DayOfWeek);
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDay(i as DayOfWeek)}
                        className={cn(
                          "w-9 h-9 rounded-full text-xs font-medium border transition-colors",
                          active
                            ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                            : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                        )}
                      >
                        {d.slice(0, 2)}
                      </button>
                    );
                  })}
                </div>
              </Field>
            ) : (
              <Field label="Date" error={errors.specificDate}>
                <input
                  type="date"
                  value={state.specificDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setState((s) => ({ ...s, specificDate: e.target.value }))}
                  className="rcm-input"
                />
              </Field>
            )}

            <div className="flex gap-3">
              <Field label="From" className="flex-1">
                <input
                  type="time"
                  value={state.timeFrom}
                  onChange={(e) => setState((s) => ({ ...s, timeFrom: e.target.value }))}
                  className="rcm-input"
                />
              </Field>
              <Field label="To" className="flex-1">
                <input
                  type="time"
                  value={state.timeTo}
                  onChange={(e) => setState((s) => ({ ...s, timeTo: e.target.value }))}
                  className="rcm-input"
                />
              </Field>
            </div>
          </div>
        );
      }
      if (step === 2) {
        return (
          <div key="t2" className={animClass + " space-y-4"}>
            <Field label="Priority">
              <div className="flex gap-1.5">
                {([1, 2, 3, 4, 5] as Priority[]).map((p) => {
                  const active = state.priority === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setState((s) => ({ ...s, priority: p }))}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all",
                        active ? "text-white scale-105" : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                      )}
                      style={active ? { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] } : {}}
                    >
                      P{p}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] text-center mt-1">
                {PRIORITY_NAMES[state.priority]}
              </p>
            </Field>

            <Field label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const active = state.tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                        active ? "text-white" : "border-[var(--color-border)]"
                      )}
                      style={active
                        ? { backgroundColor: tag.color, borderColor: tag.color }
                        : { color: tag.color, borderColor: tag.color + "66" }
                      }
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        );
      }
      if (step === 3) {
        return (
          <div key="t3" className={animClass + " space-y-3"}>
            <p className="text-sm text-[var(--color-text-secondary)]">Add to a list (optional)</p>
            <button
              onClick={() => setState((s) => ({ ...s, listId: null }))}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors",
                !state.listId
                  ? "border-[var(--color-brand)] bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
              )}
            >
              No list
            </button>
            {userLists.map((l) => (
              <button
                key={l.id}
                onClick={() => setState((s) => ({ ...s, listId: l.id }))}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors",
                  state.listId === l.id
                    ? "border-[var(--color-brand)] bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
                    : "border-[var(--color-border)] text-[var(--color-text-primary)]"
                )}
              >
                {l.title}
              </button>
            ))}
            {userLists.length === 0 && (
              <p className="text-xs text-[var(--color-text-secondary)] italic">
                No lists yet. Create a list from the Habits tab.
              </p>
            )}
          </div>
        );
      }
      if (step === 4) {
        return (
          <div key="t4" className={animClass + " space-y-3"}>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Assign to a friend or group (optional).
            </p>
            <p className="text-xs text-[var(--color-text-disabled)] italic text-center py-4">
              Friend and group search coming soon.
            </p>
          </div>
        );
      }
    }

    // List steps
    if (state.kind === "list") {
      if (step === 0) {
        return (
          <div key="l0" className={animClass + " space-y-4"}>
            <KindToggle value={state.kind} onChange={(k) => setState((s) => ({ ...s, kind: k }))} />
            <Field label="List Title" error={errors.title}>
              <input
                autoFocus
                type="text"
                maxLength={120}
                value={state.title}
                onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
                placeholder="List title..."
                className="rcm-input"
              />
            </Field>
          </div>
        );
      }
      if (step === 1) {
        return (
          <div key="l1" className={animClass + " space-y-3"}>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Add existing tasks to this list (optional)
            </p>
            <p className="text-xs text-[var(--color-text-disabled)] italic text-center py-4">
              Task picker coming soon.
            </p>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-[var(--color-surface-raised)] rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] capitalize">
              {isInfo ? "View" : mode === "edit" ? "Edit" : "New"}{" "}
              {state.kind}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">{steps[step]}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dots */}
        <div className="px-5 pb-3">
          <DotNav total={steps.length} current={step} />
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
          {errors._global && (
            <p className="mb-3 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {errors._global}
            </p>
          )}
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--color-border)] flex items-center gap-3">
          <button
            onClick={() => (step === 0 ? onClose() : go(step - 1))}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? "Cancel" : "Back"}
          </button>

          <div className="flex-1" />

          {!isInfo && (
            <button
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-brand)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? (
                "Saving..."
              ) : isLast ? (
                <><Check className="w-4 h-4" /> Save</>
              ) : (
                <>Next <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          )}

          {isInfo && !isLast && (
            <button
              onClick={() => go(step + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function KindToggle({ value, onChange }: { value: "task" | "list"; onChange: (k: "task" | "list") => void }) {
  return (
    <div className="flex gap-2">
      {(["task", "list"] as const).map((k) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize",
            value === k
              ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
              : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
          )}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

function Field({ label, error, children, className }: {
  label: string; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[var(--color-border)] last:border-0">
      <span className="text-xs font-medium text-[var(--color-text-secondary)] w-24 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-[var(--color-text-primary)] flex-1">{children}</span>
    </div>
  );
}
