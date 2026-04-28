import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/hooks/useSound";
import { cn } from "@/lib/utils";

interface SoundToggleProps {
  className?: string;
}

export const SoundToggle = ({ className }: SoundToggleProps) => {
  const { muted, toggleMuted, play } = useSound();
  return (
    <button
      onClick={() => {
        toggleMuted();
        // Confirm new state with a tap (after toggling)
        if (muted) setTimeout(() => play("tap"), 0);
      }}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
        className
      )}
      aria-label={muted ? "Unmute interface sounds" : "Mute interface sounds"}
      title={muted ? "Sounds off" : "Sounds on"}
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
};
