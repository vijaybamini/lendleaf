import { useRef, useState, useEffect } from "react";
import { X, Image, MessageCircle, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface ComposePostProps {
  isOpen: boolean;
  onClose: () => void;
  onPostSuccess: () => void;
  userAvatar?: string | null;
  displayName?: string | null;
  userHandle?: string;
}

const MAX_CHARACTERS = 280;

export function ComposePost({
  isOpen,
  onClose,
  onPostSuccess,
  userAvatar,
  displayName,
  userHandle,
}: ComposePostProps) {
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  if (!isOpen) return null;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Read file as data URL for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
      setImageFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePost = async () => {
    if (!user || !content.trim()) {
      toast.error("Please write something");
      return;
    }

    setIsPosting(true);

    try {
      let imageUrl: string | null = null;

      // Upload image if selected
      if (imageFile) {
        const fileName = `${user.id}/${Date.now()}_${imageFile.name}`;
        const { error: uploadError, data } = await supabase.storage
          .from("post-images")
          .upload(fileName, imageFile);

        if (uploadError) {
          toast.error("Failed to upload image");
          setIsPosting(false);
          return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("post-images")
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      // Extract hashtags
      const hashtags = extractHashtags(content);

      // Create post
      const { error: postError } = await supabase.from("posts").insert({
        author_id: user.id,
        content: content.trim(),
        image_url: imageUrl,
        hashtags: hashtags,
        created_at: new Date().toISOString(),
      });

      if (postError) {
        toast.error("Failed to create post");
        setIsPosting(false);
        return;
      }

      toast.success("Post published!");
      setContent("");
      setImagePreview(null);
      setImageFile(null);
      onPostSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsPosting(false);
    }
  };

  const characterCount = content.length;
  const characterPercentage = (characterCount / MAX_CHARACTERS) * 100;
  const isOver = characterCount > MAX_CHARACTERS;
  const canPost = content.trim().length > 0 && !isOver && !isPosting;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-10 bg-black/95 backdrop-blur-sm">
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <Button
          onClick={handlePost}
          disabled={!canPost}
          className="rounded-full bg-primary hover:bg-primary/90 px-4 py-1 text-sm font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Post
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20 sm:pb-0">
        {/* User Info */}
        <div className="px-4 py-3 flex gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 text-white font-semibold">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={displayName || "User"}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-sm">{(displayName?.charAt(0) || "U").toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-white font-bold text-sm">{displayName || "User"}</p>
            <p className="text-zinc-500 text-xs">@{userHandle || "user"}</p>
          </div>
        </div>

        {/* Textarea Input */}
        <div className="px-4 pt-6 pb-2">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What do you want to tell everyone?"
            className="border-0 bg-transparent text-lg text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-0 focus:border-0 font-serif"
          />
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="px-4 py-3 relative inline-block">
            <div className="relative rounded-2xl overflow-hidden max-w-xs">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-auto max-h-72 object-cover rounded-2xl"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 left-2 bg-black/70 hover:bg-black p-1.5 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="border-t border-white/10 px-4 py-4 flex items-center justify-between bg-black/95 backdrop-blur-sm sticky bottom-0 z-20">
        <div className="flex gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-primary/15 hover:bg-primary/25 rounded-full transition-all duration-200 text-primary hover:text-primary active:scale-95 flex items-center justify-center"
            title="Add photo"
            type="button"
            aria-label="Add photo to post"
          >
            <Image className="h-6 w-6" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />

          <button
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-500 cursor-not-allowed opacity-50"
            aria-label="Add poll"
            disabled
          >
            <MessageCircle className="h-5 w-5" />
          </button>

          <button
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-500 cursor-not-allowed opacity-50"
            aria-label="Add location"
            disabled
          >
            <MapPin className="h-5 w-5" />
          </button>

          <button
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-500 cursor-not-allowed opacity-50"
            aria-label="Add GIF"
            disabled
          >
            <Sparkles className="h-5 w-5" />
          </button>
        </div>

        {/* Character Count Indicator */}
        <div className="flex items-center gap-2">
          <div className="relative h-6 w-6">
            <svg className="h-6 w-6 transform -rotate-90" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-zinc-700"
              />
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 10}`}
                strokeDashoffset={`${2 * Math.PI * 10 * (1 - characterPercentage / 100)}`}
                className={`transition-all duration-200 ${
                  isOver ? "text-red-500" : "text-primary"
                }`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white">
              {characterCount > 0 && characterCount}
            </span>
          </div>
          <span className={`text-xs font-medium ${isOver ? "text-red-500" : "text-zinc-400"}`}>
            {characterCount}/{MAX_CHARACTERS}
          </span>
        </div>
      </div>
    </div>
  );
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w-]+/g) ?? [];
  const tags = matches.map((t) => t.slice(1).toLowerCase());
  return Array.from(new Set(tags));
}
