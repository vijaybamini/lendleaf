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
      <main className="flex-1 container mx-auto px-3 sm:px-4 max-w-6xl py-6 sm:py-10">
        <div className="mb-5 sm:mb-6">
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold">
            Community
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Thoughts and discussions from members
          </p>
        </div>
        <Feed />
      </main>
    </div>
  );
}
