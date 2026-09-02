import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, HelpCircle, Loader2, LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface ProfileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
}

const placeholderItems = [
  { label: "Settings", icon: Settings },
  { label: "Notifications", icon: Bell },
  { label: "Help", icon: HelpCircle },
];

export function ProfileMenuSheet({
  open,
  onOpenChange,
  displayName,
  handle,
  avatarUrl,
}: ProfileMenuSheetProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      queryClient.clear();
      await supabase.removeAllChannels();
      navigate({ to: "/" });
    } catch (err) {
      console.error("Sign out failed:", err);
      toast.error("Couldn't sign out. Please try again.");
      setSigningOut(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-80 flex-col p-0">
        <SheetHeader className="border-b border-border/80 p-4">
          <SheetTitle className="text-left font-serif text-lg">Menu</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-1 px-2 pb-2">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar className="h-10 w-10">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary/15 text-primary">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">@{handle}</p>
            </div>
          </div>

          <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Coming soon
          </p>
          {placeholderItems.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled
              aria-disabled="true"
              className="flex items-center gap-3 rounded-md px-2 py-2.5 text-sm text-muted-foreground/70"
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto border-t border-border/80 p-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full justify-center" disabled={signingOut}>
                <LogOut className="h-4 w-4 mr-2" />
                {signingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Signing out...
                  </>
                ) : (
                  "Sign out"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out?</AlertDialogTitle>
                <AlertDialogDescription>Do you want to confirm?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction disabled={signingOut} onClick={handleSignOut}>
                  {signingOut ? "Signing out..." : "Sign out"}
                </AlertDialogAction>
                <AlertDialogCancel disabled={signingOut}>Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
