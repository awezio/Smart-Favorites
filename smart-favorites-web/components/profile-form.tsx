"use client";

import { useState, useEffect, useRef } from "react";
import {
  Save,
  Loader2,
  RefreshCw,
  Upload,
  Camera,
  Mail,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getDiceBearUrl, getAllStylePreviews, AVATAR_STYLES } from "@/lib/avatars";
import type { Profile } from "@/types";

export function ProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarSeed, setAvatarSeed] = useState("");
  const [avatarStyle, setAvatarStyle] = useState("adventurer");
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to load profile");

      const profile: Profile = await res.json();
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url);
      setAvatarSeed(profile.avatar_seed || profile.id);
      if (profile.avatar_seed && profile.avatar_seed.includes(":")) {
        const [style, seed] = profile.avatar_seed.split(":", 2);
        if (AVATAR_STYLES.some((s) => s.id === style)) {
          setAvatarStyle(style);
          setAvatarSeed(seed);
        }
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      toast.error("加载个人资料失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchEmail = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) setEmail(user.email);
      } catch { /* ignore */ }
    };
    fetchEmail();
  }, []);

  const currentAvatarDisplay = avatarUrl
    ? avatarUrl
    : getDiceBearUrl(avatarStyle, avatarSeed, 128);

  const handleSave = async () => {
    setSaving(true);
    try {
      const seedToSave = `${avatarStyle}:${avatarSeed}`;
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio || null,
          avatar_seed: seedToSave,
          avatar_url: avatarUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "保存失败");
      }
      toast.success("个人资料已保存");
    } catch (err: unknown) {
      toast.error((err as Error).message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("文件过大，最大允许 2MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      toast.error("不支持的文件类型，请上传 JPG、PNG、GIF 或 WebP 图片");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "上传失败");
      }
      const data = await res.json();
      setAvatarUrl(data.avatar_url);
      setPickerOpen(false);
      toast.success("头像上传成功");
    } catch (err: unknown) {
      toast.error((err as Error).message || "头像上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRandomSeed = () => {
    setAvatarSeed(Math.random().toString(36).substring(2, 10));
    setAvatarUrl(null);
  };

  const handleStyleSelect = (styleId: string) => {
    setAvatarStyle(styleId);
    setAvatarUrl(null);
  };

  const stylePreviews = getAllStylePreviews(avatarSeed, 80);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          个人资料
        </CardTitle>
        <CardDescription>
          管理你的头像、显示名称和个人简介
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-6">
          <div className="relative group">
            <img
              src={currentAvatarDisplay}
              alt="头像"
              className="h-20 w-20 rounded-full border-2 border-border bg-muted object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(!pickerOpen)}>
              {pickerOpen ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
              更换头像
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              上传头像
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>

        {pickerOpen && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <Label className="shrink-0">随机种子</Label>
              <Input
                value={avatarSeed}
                onChange={(e) => { setAvatarSeed(e.target.value); setAvatarUrl(null); }}
                placeholder="种子值"
                className="max-w-xs"
              />
              <Button variant="outline" size="icon" onClick={handleRandomSeed} title="随机生成">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {stylePreviews.map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleStyleSelect(style.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all",
                    avatarStyle === style.id && !avatarUrl ? "border-primary bg-primary/5" : "border-transparent hover:border-border"
                  )}
                >
                  <img src={style.url} alt={style.name} className="h-14 w-14 rounded-lg bg-muted" loading="lazy" />
                  <span className="text-[10px] truncate w-full text-center">{style.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="profile-display-name">显示名称</Label>
          <Input
            id="profile-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="你的显示名称"
            maxLength={50}
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="profile-bio">个人简介</Label>
            <span className={cn("text-xs", bio.length > 180 ? "text-destructive" : "text-muted-foreground")}>
              {bio.length}/200
            </span>
          </div>
          <Textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => { if (e.target.value.length <= 200) setBio(e.target.value); }}
            placeholder="介绍一下你自己..."
            rows={2}
          />
        </div>

        {/* Email read-only */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> 邮箱
          </Label>
          <Input value={email} readOnly disabled className="bg-muted/50" />
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          保存个人资料
        </Button>
      </CardContent>
    </Card>
  );
}
