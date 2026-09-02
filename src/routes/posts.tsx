import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Feed } from "@/components/Feed";
import { ComposePost } from "@/components/ComposePost";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/posts")({
  component: PostsPage,
  validateSearch: (search: Record<string, unknown>): { compose?: boolean } => ({
    compose: search.compose === true || search.compose === "true",
  }),
  head: () => ({
    meta: [
      { title: "Community — LendLeaf" },
      {
        name: "description",
        content: "Share thoughts and join discussions with the LendLeaf community.",
      },
      { property: "og:title", content: "Community — LendLeaf" },
      {
        property: "og:description",
        content: "Share thoughts and join discussions with the LendLeaf community.",
      },
    ],
  }),
});

interface UserProfile {
  display_name: string | null;
  avatar_url: string | null;
  handle?: string;
}

function PostsPage() {
  const search = useSearch({ from: "/posts" });
  const { user } = useAuth();
  const navigate = Route.useNavigate();
  const [isComposeOpen, setIsComposeOpen] = useState(search.compose ?? false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [feedKey, setFeedKey] = useState(0);

  useEffect(() => {
    setIsComposeOpen(search.compose ?? false);
  }, [search.compose]);

  useEffect(() => {
    if (!user) return;

    const fetchUserProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .single();

      // Derive handle from email (username before @)
      const handle = user.email?.split("@")[0] || "user";

      setUserProfile({
        ...data,
        handle,
      });
    };

    fetchUserProfile();
  }, [user]);

  const handleCloseCompose = () => {
    // Navigate back to home when closing compose
    navigate({ to: "/" });
  };

  const handlePostSuccess = () => {
    // Close modal and navigate to home tab
    setIsComposeOpen(false);
    navigate({ to: "/" });
  };

  return (
    <>
      <div className="w-full sm:px-4 sm:py-8">
        <div className="border-b border-border bg-background px-4 py-3 sm:mb-6 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <h1 className="font-serif text-xl font-semibold text-foreground sm:text-4xl md:text-5xl">
            Posts
          </h1>
          <p className="hidden text-sm text-muted-foreground sm:mt-1 sm:block sm:text-base">
            Thoughts and discussions from members
          </p>
          <p className="text-xs text-muted-foreground sm:hidden">
            Book talk from your lending circle
          </p>
        </div>
        <Feed key={feedKey} />
      </div>

      <ComposePost
        isOpen={isComposeOpen}
        onClose={handleCloseCompose}
        onPostSuccess={handlePostSuccess}
        displayName={userProfile?.display_name}
        userAvatar={userProfile?.avatar_url}
        userHandle={userProfile?.handle}
      />
    </>
  );
}
