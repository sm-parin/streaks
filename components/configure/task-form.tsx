"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DayPicker } from "./day-picker";
import { ColorPicker } from "./color-picker";
import { DEFAULT_TASK_COLOR } from "@/lib/utils/constants";
import type { Task, TaskFormData, DayOfWeek } from "@/lib/types";

// ΓöÇΓöÇΓöÇ Validation schema ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const taskSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(60, "Name must be 60 characters or less"),
  description: z.string().max(200, "Description must be 200 characters or less").optional(),
  active_days: z
    .array(z.number().min(0).max(6))
    .min(1, "Select at least one day"),
  color: z.string().min(1, "Colour is required"),
});

type FieldErrors = Partial<Record<keyof TaskFormData, string>>;

// ΓöÇΓöÇΓöÇ Props ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface TaskFormProps {
  /** When provided, pre-fills the form fields for editing */
  initialData?: Task;
  onSubmit: (data: TaskFormData) => Promise<boolean>;
  onCancel: () => void;
  submitLabel?: string;
}

/**
 * Create / edit task form with Zod validation.
 * Shared by both the "Add Task" dialog and the inline edit flow.
 */
export function TaskForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: TaskFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [activeDays, setActiveDays] = useState<DayOfWeek[]>(
    initialData?.active_days ?? []
  );
  const [color, setColor] = useState(
    initialData?.color ?? DEFAULT_TASK_COLOR
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  /** Validates all fields and returns parsed data or null on failure */
  const validate = (): TaskFormData | null => {
    const result = taskSchema.safeParse({
      name: name.trim(),
      description: description.trim() || undefined,
      active_days: activeDays,
      color,
    });

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0] as keyof TaskFormData;
        if (!fieldErrors[field]) fieldErrors[field] = e.message;
      });
      setErrors(fieldErrors);
      return null;
    }

    setErrors({});
    return result.data as TaskFormData;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = validate();
    if (!data) return;

    setSubmitting(true);
    const success = await onSubmit(data);
    setSubmitting(false);
    if (success) onCancel();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/** Task name */}
      <div>
        <Label htmlFor="task-name" required>
          Task name
        </Label>
        <Input
          id="task-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Read 20 pages"
          maxLength={60}
          hasError={!!errors.name}
          autoFocus
        />
        {errors.name && (
          <p className="mt-1 text-xs text-[var(--color-error)]">{errors.name}</p>
        )}
      </div>

      {/** Description (optional) */}
      <div>
        <Label htmlFor="task-desc">Description (optional)</Label>
        <Input
          id="task-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief notes about this habit"
          maxLength={200}
        />
      </div>

      {/** Scheduled days */}
      <div>
        <Label required>Scheduled days</Label>
        <DayPicker
          selected={activeDays}
          onChange={setActiveDays}
          hasError={!!errors.active_days}
        />
        {errors.active_days && (
          <p className="mt-1 text-xs text-[var(--color-error)]">
            {errors.active_days}
          </p>
        )}
      </div>

      {/** Colour */}
      <div>
        <Label>Colour</Label>
        <ColorPicker selected={color} onChange={setColor} />
      </div>

      {/** Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" fullWidth loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
