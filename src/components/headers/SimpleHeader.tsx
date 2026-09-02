import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SimpleHeaderProps {
  title: string;
  showBack?: boolean;
}

export function SimpleHeader({ title, showBack = true }: SimpleHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-4 flex items-center gap-3 h-14 sm:h-16">
        {showBack && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={() => navigate({ to: "/" })}
            className="flex-shrink-0 text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h1>
      </div>
    </header>
  );
}
