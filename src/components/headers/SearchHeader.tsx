import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Search, X, SlidersHorizontal, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useRef, type ReactNode } from "react";

export interface SearchFilters {
  genre: string | null;
  km: number | null;
}

const KM_OPTIONS = [5, 10, 25, 50];

interface SearchHeaderProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  filters?: SearchFilters;
  onFiltersChange?: (filters: SearchFilters) => void;
  genreOptions?: string[];
  locationLabel?: string | null;
  locationLoading?: boolean;
  locationError?: string | null;
  onDetectLocation?: () => void;
  onClearLocation?: () => void;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function SearchHeader({
  value,
  onChange,
  onSubmit,
  filters,
  onFiltersChange,
  genreOptions = [],
  locationLabel,
  locationLoading = false,
  locationError,
  onDetectLocation,
  onClearLocation,
}: SearchHeaderProps) {
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

  const activeCount = filters
    ? (filters.genre ? 1 : 0) + (filters.km ? 1 : 0)
    : 0;

  const setGenre = (genre: string | null) =>
    onFiltersChange?.({ genre, km: filters?.km ?? null });

  const setKm = (km: number | null) =>
    onFiltersChange?.({ genre: filters?.genre ?? null, km });

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-3 py-2 sm:px-4 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Back"
          onClick={() => navigate({ to: "/" })}
          className="h-10 w-10 flex-shrink-0 text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Search Input Container */}
        <div className="flex-1 relative flex items-center">
          <Search className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search books, posts, people"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-10 py-2 h-10 rounded-lg border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Filters */}
        {onFiltersChange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Filters"
                title="Filters"
                className="relative h-10 w-10 flex-shrink-0 rounded-lg border-border"
              >
                <SlidersHorizontal className="h-5 w-5" />
                {activeCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Genre
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip active={!filters?.genre} onClick={() => setGenre(null)}>
                      All
                    </Chip>
                    {genreOptions.map((g) => (
                      <Chip
                        key={g}
                        active={filters?.genre === g}
                        onClick={() => setGenre(filters?.genre === g ? null : g)}
                      >
                        {g}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nearby
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip active={!filters?.km} onClick={() => setKm(null)}>
                      All
                    </Chip>
                    {KM_OPTIONS.map((km) => (
                      <Chip
                        key={km}
                        active={filters?.km === km}
                        onClick={() => setKm(filters?.km === km ? null : km)}
                      >
                        Within {km} km
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Your location
                  </p>
                  {locationLabel ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={onClearLocation}
                        aria-label="Clear location"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {locationLabel}
                      </span>
                      
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={onDetectLocation}
                      disabled={locationLoading}
                    >
                      {locationLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      {locationLoading ? "Detecting..." : "Use my location"}
                    </Button>
                  )}
                  {locationError && (
                    <p className="mt-1 text-xs text-destructive">{locationError}</p>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </header>
  );
}
