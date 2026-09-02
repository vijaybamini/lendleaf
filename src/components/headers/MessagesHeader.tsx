import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessagesHeaderProps {
  title?: string;
  subtitle?: string;
  hideBack?: boolean;
  onBack?: () => void;
}

export function MessagesHeader({
  title = "Messages",
  subtitle,
  hideBack,
  onBack,
}: MessagesHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-4 flex items-center gap-3 h-14 sm:h-16">
        {!hideBack && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={handleBack}
            className="flex-shrink-0 text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}
