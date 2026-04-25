import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Loader2, Send, MessageCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    to: typeof search.to === "string" && search.to.length > 0 ? search.to : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Messages — LendLeaf" },
      { name: "description", content: "Direct messages with other LendLeaf members." },
    ],
  }),
});

interface ProfileLite {
  id: string;
  display_name: string | null;
}

interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface ConversationSummary {
  partnerId: string;
  partner: ProfileLite | null;
  lastMessage: MessageRow;
  unreadCount: number;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function initialsOf(name: string | null | undefined) {
  return (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const activePartnerId = search.to ?? null;

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [activePartner, setActivePartner] = useState<ProfileLite | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [authLoading, user, navigate]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvs(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      toast.error("Couldn't load conversations");
      setLoadingConvs(false);
      return;
    }

    const rows = (data ?? []) as MessageRow[];
    const map = new Map<string, ConversationSummary>();

    for (const m of rows) {
      const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const existing = map.get(partnerId);
      if (!existing) {
        map.set(partnerId, {
          partnerId,
          partner: null,
          lastMessage: m,
          unreadCount: m.recipient_id === user.id && !m.read ? 1 : 0,
        });
      } else if (m.recipient_id === user.id && !m.read) {
        existing.unreadCount += 1;
      }
    }

    const partnerIds = Array.from(map.keys());
    if (partnerIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", partnerIds);
      (profiles ?? []).forEach((p) => {
        const c = map.get(p.id);
        if (c) c.partner = p;
      });
    }

    setConversations(Array.from(map.values()));
    setLoadingConvs(false);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when active partner changes
  const loadMessages = useCallback(
    async (partnerId: string) => {
      if (!user) return;
      setLoadingMsgs(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })
        .limit(500);

      if (error) {
        toast.error("Couldn't load messages");
        setLoadingMsgs(false);
        return;
      }
      setMessages((data ?? []) as MessageRow[]);
      setLoadingMsgs(false);

      // Mark unread messages from partner as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", partnerId)
        .eq("recipient_id", user.id)
        .eq("read", false);

      // Refresh conversation list to clear badges
      loadConversations();
    },
    [user, loadConversations],
  );

  useEffect(() => {
    if (!activePartnerId || !user) {
      setMessages([]);
      setActivePartner(null);
      return;
    }
    // Find or fetch partner profile
    const known = conversations.find((c) => c.partnerId === activePartnerId)?.partner;
    if (known) {
      setActivePartner(known);
    } else {
      supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", activePartnerId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setActivePartner(data as ProfileLite);
        });
    }
    loadMessages(activePartnerId);
  }, [activePartnerId, user, conversations, loadMessages]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const m = payload.new as MessageRow;
          // If chat with sender is open, append + mark read
          if (activePartnerId && m.sender_id === activePartnerId) {
            setMessages((prev) => [...prev, m]);
            supabase
              .from("messages")
              .update({ read: true })
              .eq("id", m.id);
          }
          loadConversations();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const m = payload.new as MessageRow;
          if (activePartnerId && m.recipient_id === activePartnerId) {
            setMessages((prev) => {
              if (prev.some((x) => x.id === m.id)) return prev;
              return [...prev, m];
            });
          }
          loadConversations();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activePartnerId, loadConversations]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) =>
          new Date(b.lastMessage.created_at).getTime() -
          new Date(a.lastMessage.created_at).getTime(),
      ),
    [conversations],
  );

  const handleSend = async () => {
    if (!user || !activePartnerId) return;
    const content = draft.trim();
    if (!content) return;
    if (content.length > 2000) {
      toast.error("Message too long");
      return;
    }
    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        recipient_id: activePartnerId,
        content,
      })
      .select("*")
      .single();
    setSending(false);
    if (error) {
      toast.error(error.message || "Couldn't send");
      return;
    }
    setMessages((prev) => {
      if (prev.some((m) => m.id === (data as MessageRow).id)) return prev;
      return [...prev, data as MessageRow];
    });
    setDraft("");
    loadConversations();
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-5xl px-2 sm:px-4 py-4 sm:py-6">
        <div className="paper-card rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[70vh]">
          {/* Conversation list — hidden on mobile when a chat is open */}
          <aside
            className={`border-r bg-muted/20 ${
              activePartnerId ? "hidden md:block" : "block"
            }`}
          >
            <div className="px-4 py-3 border-b">
              <h1 className="font-serif text-lg font-semibold">Messages</h1>
            </div>
            {loadingConvs ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sortedConversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                No conversations yet. Start one from a member's profile or a
                borrow request.
              </div>
            ) : (
              <ul className="divide-y">
                {sortedConversations.map((c) => {
                  const isActive = activePartnerId === c.partnerId;
                  return (
                    <li key={c.partnerId}>
                      <Link
                        to="/messages"
                        search={{ to: c.partnerId }}
                        className={`flex gap-3 items-start px-4 py-3 hover:bg-muted/40 transition-colors ${
                          isActive ? "bg-muted/50" : ""
                        }`}
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
                          {initialsOf(c.partner?.display_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-semibold text-sm truncate">
                              {c.partner?.display_name ?? "Member"}
                            </p>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {timeAgo(c.lastMessage.created_at)}
                            </span>
                          </div>
                          <p
                            className={`text-xs truncate ${
                              c.unreadCount > 0
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {c.lastMessage.sender_id === user.id ? "You: " : ""}
                            {c.lastMessage.content}
                          </p>
                        </div>
                        {c.unreadCount > 0 && (
                          <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                            {c.unreadCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Chat panel */}
          <section
            className={`flex flex-col ${
              activePartnerId ? "block" : "hidden md:flex"
            }`}
          >
            {!activePartnerId ? (
              <div className="flex-1 flex items-center justify-center text-center text-muted-foreground p-6">
                <div>
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Select a conversation to start chatting.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-3 sm:px-4 py-3 border-b">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="md:hidden -ml-1"
                    aria-label="Back"
                  >
                    <Link to="/messages">
                      <ArrowLeft className="h-5 w-5" />
                    </Link>
                  </Button>
                  <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {initialsOf(activePartner?.display_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">
                      {activePartner?.display_name ?? "Member"}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2 bg-muted/10"
                  style={{ maxHeight: "calc(100vh - 220px)" }}
                >
                  {loadingMsgs ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-8">
                      Say hi to start the conversation.
                    </p>
                  ) : (
                    messages.map((m, idx) => {
                      const mine = m.sender_id === user.id;
                      const prev = messages[idx - 1];
                      const showTime =
                        !prev ||
                        new Date(m.created_at).getTime() -
                          new Date(prev.created_at).getTime() >
                          5 * 60_000;
                      return (
                        <div key={m.id}>
                          {showTime && (
                            <p className="text-center text-[10px] text-muted-foreground my-2">
                              {new Date(m.created_at).toLocaleString()}
                            </p>
                          )}
                          <div
                            className={`flex ${
                              mine ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                                mine
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-background border rounded-bl-sm"
                              }`}
                            >
                              {m.content}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Composer */}
                <div className="border-t p-2 sm:p-3 bg-background">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2 items-end"
                  >
                    <Input
                      placeholder="Write a message…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={2000}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={sending || !draft.trim()}
                      aria-label="Send"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
