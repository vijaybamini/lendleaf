import { createFileRoute } from "@tanstack/react-router";
import { Feed } from "@/components/Feed";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/posts")({
  component: PostsPage,
  head: () => ({
    meta: [
      { title: "Community — LendLeaf" },
      {
        name: "description",
        content:
          "Share thoughts and join discussions with the LendLeaf community.",
      },
      { property: "og:title", content: "Community — LendLeaf" },
      {
        property: "og:description",
        content: "Share thoughts and join discussions with the LendLeaf community.",
      },
    ],
  }),
});

function PostsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 w-full mx-auto max-w-6xl sm:px-4 sm:py-10">
        <div className="border-b border-border/70 bg-background/95 px-4 py-3 sm:mb-6 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <h1 className="font-serif text-xl font-semibold sm:text-4xl md:text-5xl">
            Posts
          </h1>
          <p className="hidden text-muted-foreground mt-1 text-sm sm:block sm:text-base">
            Thoughts and discussions from members
          </p>
          <p className="text-xs text-muted-foreground sm:hidden">
            Book talk from your lending circle
          </p>
        </div>
        <Feed />
      </main>
    </div>
  );
}
