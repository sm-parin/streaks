import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

const router = t.router;
const publicProcedure = t.procedure;

/** All protected procedures throw UNAUTHORIZED if session is null. */
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});

// ─── tasks ───────────────────────────────────────────────────────────────────
const taskRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(120),
        description: z.string().max(500).nullable().optional(),
        priority: z.number().int().min(1).max(5).default(3),
        is_recurring: z.boolean().default(true),
        active_days: z.array(z.number().int().min(0).max(6)).default([]),
        specific_date: z.string().nullable().optional(),
        time_from: z.string().nullable().optional(),
        time_to: z.string().nullable().optional(),
        list_id: z.string().uuid().nullable().optional(),
        assignee_user_id: z.string().uuid().nullable().optional(),
        group_id: z.string().uuid().nullable().optional(),
        allow_grace: z.boolean().default(true),
        tag_ids: z.array(z.string().uuid()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.assignee_user_id && input.group_id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A task can have either an assignee or a group — not both",
        });
      }
      const assigneeId = input.assignee_user_id ?? null;
      const isSelf = !assigneeId || assigneeId === ctx.session.sub;
      if (!isSelf && !input.group_id) {
        const admin = createServiceClient();
        const { data: friendship } = await admin
          .from("friendships")
          .select("id")
          .or(
            `and(requester_id.eq.${ctx.session.sub},addressee_id.eq.${assigneeId}),` +
              `and(requester_id.eq.${assigneeId},addressee_id.eq.${ctx.session.sub})`
          )
          .eq("status", "accepted")
          .maybeSingle();
        if (!friendship) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Can only assign tasks to friends" });
        }
      }
      const status = isSelf || input.group_id ? "accepted" : "pending";
      const taskUserId = isSelf ? ctx.session.sub : assigneeId!;
      const { data: task, error } = await ctx.supabase
        .from("tasks")
        .insert({
          user_id: taskUserId,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority,
          tag_ids: input.tag_ids,
          status,
          is_recurring: input.is_recurring,
          active_days: input.active_days,
          specific_date: input.is_recurring ? null : (input.specific_date ?? null),
          time_from: input.time_from ?? null,
          time_to: input.time_to ?? null,
          list_id: input.list_id ?? null,
          assigner_user_id: ctx.session.sub,
          assignee_user_id: assigneeId,
          group_id: input.group_id ?? null,
          allow_grace: input.allow_grace,
        })
        .select()
        .single();
      if (error || !task) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error?.message ?? "Failed" });
      }
      if (!isSelf && assigneeId) {
        const admin = createServiceClient();
        await admin.from("notifications").insert({
          user_id: assigneeId,
          type: "task_assigned",
          payload: { task_id: task.id, title: task.title, assigner_id: ctx.session.sub },
        });
      }
      return task;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(120).optional(),
        description: z.string().max(500).nullable().optional(),
        priority: z.number().int().min(1).max(5).optional(),
        tag_ids: z.array(z.string().uuid()).optional(),
        is_recurring: z.boolean().optional(),
        active_days: z.array(z.number().int().min(0).max(6)).optional(),
        specific_date: z.string().nullable().optional(),
        time_from: z.string().nullable().optional(),
        time_to: z.string().nullable().optional(),
        list_id: z.string().uuid().nullable().optional(),
        status: z.enum(["pending", "accepted", "completed", "rejected"]).optional(),
        allow_grace: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      const { data: task, error } = await ctx.supabase
        .from("tasks")
        .update(fields)
        .eq("id", id)
        .eq("user_id", ctx.session.sub)
        .select()
        .single();
      if (error || !task) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not found or unauthorized" });
      }
      return task;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("tasks")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.session.sub);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { success: true };
    }),

  toggleComplete: protectedProcedure
    .input(z.object({ task_id: z.string().uuid(), date: z.string(), is_grace: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const { data: task } = await ctx.supabase
        .from("tasks")
        .select("is_recurring, status")
        .eq("id", input.task_id)
        .single();
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

      if (task.is_recurring) {
        const { data: existing } = await ctx.supabase
          .from("task_completions")
          .select("id")
          .eq("task_id", input.task_id)
          .eq("user_id", ctx.session.sub)
          .eq("completed_date", input.date)
          .maybeSingle();
        if (existing) {
          await ctx.supabase.from("task_completions").delete().eq("id", existing.id);
          return { completed: false, date: input.date };
        }
        await ctx.supabase.from("task_completions").insert({
          task_id: input.task_id,
          user_id: ctx.session.sub,
          completed_date: input.date,
          is_grace: input.is_grace,
        });
        return { completed: true, date: input.date };
      }

      // One-off task: toggle status
      const newStatus = task.status === "completed" ? "accepted" : "completed";
      await ctx.supabase.from("tasks").update({ status: newStatus }).eq("id", input.task_id);
      return { completed: newStatus === "completed", date: input.date };
    }),
});

// ─── lists ───────────────────────────────────────────────────────────────────
const listRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(120),
        description: z.string().max(500).nullable().optional(),
        priority: z.number().int().min(1).max(5).default(3),
        tag_ids: z.array(z.string().uuid()).default([]),
        task_ids: z.array(z.string().uuid()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { task_ids, ...listFields } = input;
      const { data: list, error } = await ctx.supabase
        .from("lists")
        .insert({ ...listFields, user_id: ctx.session.sub })
        .select()
        .single();
      if (error || !list) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error?.message ?? "Failed" });
      }
      if (task_ids?.length) {
        await ctx.supabase
          .from("tasks")
          .update({ list_id: list.id })
          .in("id", task_ids)
          .eq("user_id", ctx.session.sub);
      }
      return list;
    }),
});

// ─── social ──────────────────────────────────────────────────────────────────
const socialRouter = router({
  sendFriendRequest: protectedProcedure
    .input(z.object({ addressee_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: existing } = await ctx.supabase
        .from("friendships")
        .select("id")
        .or(
          `and(requester_id.eq.${ctx.session.sub},addressee_id.eq.${input.addressee_id}),` +
            `and(requester_id.eq.${input.addressee_id},addressee_id.eq.${ctx.session.sub})`
        )
        .maybeSingle();
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Friendship already exists" });
      const { error } = await ctx.supabase.from("friendships").insert({
        requester_id: ctx.session.sub,
        addressee_id: input.addressee_id,
        status: "pending",
      });
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      const admin = createServiceClient();
      await admin.from("notifications").insert({
        user_id: input.addressee_id,
        type: "friend_request",
        payload: { requester_id: ctx.session.sub },
      });
      return { success: true };
    }),

  respondToFriendRequest: protectedProcedure
    .input(z.object({ friendship_id: z.string().uuid(), accept: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { data: friendship, error: fetchErr } = await ctx.supabase
        .from("friendships")
        .select("*")
        .eq("id", input.friendship_id)
        .eq("addressee_id", ctx.session.sub)
        .single();
      if (fetchErr || !friendship) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not found or unauthorized" });
      }
      const newStatus = input.accept ? "accepted" : "rejected";
      const { data: updated, error } = await ctx.supabase
        .from("friendships")
        .update({ status: newStatus })
        .eq("id", input.friendship_id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return updated;
    }),
});


// ─── milestone helper ─────────────────────────────────────────────────────

const MILESTONE_STREAKS = [7, 30, 100, 365];

async function checkAndFireMilestone(userId: string, taskId: string): Promise<void> {
  const admin = createServiceClient();
  const { data: task } = await admin.from("tasks").select("title").eq("id", taskId).maybeSingle();
  if (!task) return;
  const { data, error } = await admin.functions.invoke("streak-calc", { body: { user_id: userId } });
  if (error || !Array.isArray(data)) return;
  const streakRow = (data as Array<{ task_id: string; currentStreak: number }>).find((s) => s.task_id === taskId);
  if (!streakRow) return;
  const { currentStreak } = streakRow;
  if (!MILESTONE_STREAKS.includes(currentStreak)) return;
  await admin.from("notifications").insert({
    user_id: userId, type: "streak_milestone",
    payload: { streak: currentStreak, streak_days: currentStreak, task_title: task.title, task_id: taskId },
  });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, keys_p256dh, keys_auth").eq("user_id", userId);
  if (!subs?.length) return;
  const payload = JSON.stringify({ title: "Streaks", body: `You hit a ${currentStreak}-day streak on '${task.title}'!`, url: "/streaks" });
  const toDelete: string[] = [];
  for (const sub of subs) {
    try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } }, payload); }
    catch (err: unknown) { if ((err as { statusCode?: number }).statusCode === 410) toDelete.push(sub.endpoint); }
  }
  if (toDelete.length) await admin.from("push_subscriptions").delete().in("endpoint", toDelete);
}

export const appRouter = router({ tasks: taskRouter, lists: listRouter, social: socialRouter });
export type AppRouter = typeof appRouter;
export { publicProcedure, router };
