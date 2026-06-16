"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/context";
import { getSocket } from "@/lib/socket";

type NotifyEvent = {
  type: "friend_request" | "lobby_full" | "match_accepted";
  [key: string]: unknown;
};

export function useNotifications() {
  const { showToast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    const sock = getSocket();
    if (!sock) return;

    const handler = (event: NotifyEvent) => {
      switch (event.type) {
        case "friend_request":
          showToast(t("friends.newRequest"), "info");
          break;
        case "lobby_full":
          showToast(t("lobbies.yourLobbyFull"), "success");
          break;
        case "match_accepted":
          showToast(t("matches.yourMatchAccepted"), "success");
          break;
      }
    };

    sock.on("notify", handler);
    return () => { sock.off("notify", handler); };
  }, [showToast, t]);
}
