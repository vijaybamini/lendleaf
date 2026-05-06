import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useRef } from "react";

interface SearchHeaderProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export function SearchHeader({ value, onChange, onSubmit }: SearchHeaderProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSubmit(value);
    }
  };

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-[#070a0f]/95 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-3 py-2 sm:px-4 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Back"
          onClick={() => navigate({ to: "/" })}
          className="flex-shrink-0 h-10 w-10 text-zinc-100 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Search Input Container */}
        <div className="flex-1 relative flex items-center">
          <Search className="absolute left-3 h-5 w-5 text-zinc-400 pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search books, posts, people"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-10 py-2 h-10 rounded-lg bg-zinc-800 border-0 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-700 focus-visible:outline-none"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="absolute right-3 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
