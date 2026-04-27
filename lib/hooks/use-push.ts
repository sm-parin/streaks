"use client";
import { useState, useEffect, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

export function usePush() {
  const isSupported =
    typeof window !== "undefined" &&
    typeof Notification !== "undefined" &&
    "PushManager" in window &&
    "serviceWorker" in navigator;

  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (isSupported) setPermission(Notification.permission);
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return false;

      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!);
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      const json = subscription.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } };

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } }),
      });

      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      return false;
    }
  }, [isSupported]);

  return { isSupported, permission, requestPermission };
}
