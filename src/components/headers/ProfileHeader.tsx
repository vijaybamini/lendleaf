import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileHeaderProps {
  username?: string;
  onSettingsClick?: () => void;
}

export function ProfileHeader({ 
  username = "Profile",
  onSettingsClick
}: ProfileHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070a0f]/95 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-4 flex items-center justify-between h-14 sm:h-16">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={() => navigate({ to: "/" })}
            className="flex-shrink-0 text-zinc-100 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg sm:text-xl font-semibold text-white truncate">
            {username.startsWith("@") ? username : `@${username}`}
          </h1>
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Settings"
          onClick={onSettingsClick}
          className="flex-shrink-0 text-zinc-100 hover:bg-white/10 hover:text-white"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
