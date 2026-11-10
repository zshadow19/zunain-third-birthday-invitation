"use client";

import { useEffect, useRef, useState } from "react";
import { createInvitationMusic, type InvitationMusicController, type MusicStatus } from "./invitation-music";

export function useInvitationMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const controller = useRef<InvitationMusicController | null>(null);
  const [status, setStatus] = useState<MusicStatus>("unavailable");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let active = true;
    controller.current = createInvitationMusic(audio, (next) => { if (active) setStatus(next); });
    return () => { active = false; controller.current?.dispose(); controller.current = null; };
  }, []);

  return {
    audioRef,
    status,
    startFromEnvelope: () => controller.current?.startFromEnvelope(),
    toggle: () => controller.current?.toggle(),
  };
}
