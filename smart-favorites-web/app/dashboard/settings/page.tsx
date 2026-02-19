"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Check,
  X,
  Loader2,
  TestTube,
  Eye,
  EyeOff,
  AlertCircle,
  Github,
  Smartphone,
  Copy,
} from "lucide-react";
import { ProfileForm } from "@/components/profile-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LLMProvider } from "@/types";

const PROVIDERS: {
  id: LLMProvider;
  name: string;
  placeholder: string;
  hint: string;
}[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    placeholder: "sk-...",
    hint: "推荐，性价比高。在 platform.deepseek.com 获取",
  },
  {
    id: "openai",
    name: "OpenAI",
    placeholder: "sk-...",
    hint: "在 platform.openai.com 获取",
  },
  {
    id: "kimi",
    name: "Kimi (月之暗面)",
    placeholder: "sk-...",
    hint: "在 platform.moonshot.cn 获取",
  },
  {
    id: "qwen",
    name: "Qwen (通义千问)",
    placeholder: "sk-...",
    hint: "在 dashscope.console.aliyun.com 获取",
  },
  {
    id: "claude",
    name: "Claude (Anthropic)",
    placeholder: "sk-ant-...",
    hint: "在 console.anthropic.com 获取",
  },
  {
    id: "gemini",
    name: "Gemini (Google)",
    placeholder: "AI...",
    hint: "在 aistudio.google.com 获取",
  },
  {
    id: "glm",
    name: "GLM (智谱AI)",
    placeholder: "...",
    hint: "在 open.bigmodel.cn 获取",
  },
];

type TestState = "idle" | "testing" | "success" | "error";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings
  const [defaultProvider, setDefaultProvider] = useState<string>("deepseek");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testStates, setTestStates] = useState<Record<string, TestState>>({});
  const [testErrors, setTestErrors] = useState<Record<string, string>>({});
  const [testLatencies, setTestLatencies] = useState<Record<string, number>>({});
  const [providerStatus, setProviderStatus] = useState<
    Record<string, { configured: boolean; source: string }>
  >({});

  // GitHub
  const [githubUsername, setGithubUsername] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{
    configured: boolean;
    hasToken: boolean;
    hasEnvToken: boolean;
  }>({ configured: false, hasToken: false, hasEnvToken: false });

  // Automation
  const [autoDescription, setAutoDescription] = useState(false);
  const [autoSnapshot, setAutoSnapshot] = useState(false);

  // Extension token
  const [extensionTokenPreview, setExtensionTokenPreview] = useState<string | null>(null);
  const [extensionTokenGenerated, setExtensionTokenGenerated] = useState<string | null>(null);
  const [extensionTokenLoading, setExtensionTokenLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadExtensionTokenStatus = async () => {
    try {
      const res = await fetch("/api/settings/extension-token");
      if (res.ok) {
        const data = await res.json();
        setExtensionTokenPreview(data.hasToken ? data.tokenPreview : null);
      }
    } catch (e) {
      console.error("Failed to load extension token status:", e);
    }
  };

  const handleGenerateExtensionToken = async () => {
    setExtensionTokenLoading(true);
    try {
      const res = await fetch("/api/settings/extension-token", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setExtensionTokenGenerated(data.token);
        setExtensionTokenPreview(data.token ? `••••${data.token.slice(-8)}` : null);
        toast.success("Token 已生成，请复制保存");
      } else {
        toast.error(data.error || "生成失败");
      }
    } catch (e) {
      toast.error("生成失败");
    } finally {
      setExtensionTokenLoading(false);
    }
  };

  const copyExtensionToken = async () => {
    const token = extensionTokenGenerated;
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setDefaultProvider(data.defaultProvider || "deepseek");
        setProviderStatus(data.providers || {});
        setGithubUsername(data.github?.username || "");
        setGithubStatus({
          configured: data.github?.configured || false,
          hasToken: data.github?.hasToken || false,
          hasEnvToken: data.github?.hasEnvToken || false,
        });
        setAutoDescription(data.autoGenerateDescription || false);
        setAutoSnapshot(data.autoSnapshot || false);

        await loadExtensionTokenStatus();

        // Set masked keys
        const masked = data.userApiKeys || {};
        setApiKeys(masked);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Filter out masked placeholders before sending
      const keysToSend: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(apiKeys)) {
        if (v && !v.startsWith("••••")) {
          keysToSend[k] = v;
        }
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_llm_provider: defaultProvider,
          api_keys: keysToSend,
          github_username: githubUsername,
          github_token: githubToken || undefined,
          auto_generate_description: autoDescription,
          auto_snapshot: autoSnapshot,
        }),
      });

      if (res.ok) {
        toast.success("设置已保存");
        await loadSettings();
      } else {
        const err = await res.json();
        toast.error(err.error || "保存失败");
      }
    } catch (err) {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const testProvider = async (provider: string) => {
    setTestStates((s) => ({ ...s, [provider]: "testing" }));
    setTestErrors((s) => ({ ...s, [provider]: "" }));

    try {
      const key = apiKeys[provider];
      const body: any = { provider };
      if (key && !key.startsWith("••••")) {
        body.apiKey = key;
      }

      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setTestStates((s) => ({ ...s, [provider]: "success" }));
        setTestLatencies((s) => ({ ...s, [provider]: data.latency }));
      } else {
        setTestStates((s) => ({ ...s, [provider]: "error" }));
        setTestErrors((s) => ({ ...s, [provider]: data.error }));
      }
    } catch {
      setTestStates((s) => ({ ...s, [provider]: "error" }));
      setTestErrors((s) => ({ ...s, [provider]: "网络错误" }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">设置</h1>
          <p className="text-muted-foreground mt-1">
            在这里配置你的 AI 服务和 API 密钥，所有配置存储在你的账号中
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          保存设置
        </Button>
      </div>

      {/* Profile */}
      <ProfileForm />

      {/* Extension Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            扩展连接
          </CardTitle>
          <CardDescription>
            生成 Token 后在浏览器扩展设置页粘贴，实现扩展与 Web 端数据同步
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {extensionTokenGenerated ? (
            <div className="space-y-2">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                请立即复制并保存，关闭后将无法再次查看完整 Token
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={extensionTokenGenerated}
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="icon" onClick={copyExtensionToken}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExtensionTokenGenerated(null)}
              >
                不再显示
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {extensionTokenPreview && (
                <span className="text-sm text-muted-foreground">
                  当前 Token: {extensionTokenPreview}
                </span>
              )}
              <Button
                variant="outline"
                onClick={handleGenerateExtensionToken}
                disabled={extensionTokenLoading}
              >
                {extensionTokenLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Smartphone className="h-4 w-4 mr-2" />
                )}
                {extensionTokenPreview ? "重新生成 Token" : "生成扩展 Token"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Default Provider */}
      <Card>
        <CardHeader>
          <CardTitle>默认 AI 提供商</CardTitle>
          <CardDescription>
            选择默认使用的 AI 服务，你也可以在聊天时临时切换
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setDefaultProvider(p.id)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  defaultProvider === p.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Provider API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>AI 服务配置</CardTitle>
          <CardDescription>
            输入 API Key 后点击"测试"验证连通性。密钥安全存储在你的账号中。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROVIDERS.map((p) => {
            const status = providerStatus[p.id];
            const ts = testStates[p.id] || "idle";

            return (
              <div
                key={p.id}
                className="p-4 rounded-lg border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    {/* Status indicator */}
                    {status?.configured ? (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-muted-foreground">
                          {status.source === "user"
                            ? "用户配置"
                            : "环境变量"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                        <span className="text-xs text-muted-foreground">
                          未配置
                        </span>
                      </div>
                    )}
                    {defaultProvider === p.id && (
                      <Badge variant="default" className="text-[10px]">
                        默认
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testProvider(p.id)}
                    disabled={ts === "testing"}
                    className="h-8"
                  >
                    {ts === "testing" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : ts === "success" ? (
                      <Check className="h-3.5 w-3.5 text-green-500 mr-1" />
                    ) : ts === "error" ? (
                      <X className="h-3.5 w-3.5 text-red-500 mr-1" />
                    ) : (
                      <TestTube className="h-3.5 w-3.5 mr-1" />
                    )}
                    测试
                    {ts === "success" && testLatencies[p.id] && (
                      <span className="ml-1 text-green-600">
                        {testLatencies[p.id]}ms
                      </span>
                    )}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKeys[p.id] ? "text" : "password"}
                      placeholder={p.placeholder}
                      value={apiKeys[p.id] || ""}
                      onChange={(e) =>
                        setApiKeys((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowKeys((prev) => ({
                          ...prev,
                          [p.id]: !prev[p.id],
                        }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKeys[p.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{p.hint}</p>

                {ts === "error" && testErrors[p.id] && (
                  <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="break-all">{testErrors[p.id]}</span>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* GitHub Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub 配置
          </CardTitle>
          <CardDescription>
            同步 GitHub Stars <strong>必须</strong>配置 GitHub Token。
            Token 需要 <code className="text-xs bg-muted px-1 py-0.5 rounded">read:user</code> 权限。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>GitHub 用户名</Label>
            <Input
              placeholder="your-username"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              GitHub Personal Access Token
              {githubStatus.configured && (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-normal text-muted-foreground">
                    {githubStatus.hasToken ? "用户配置" : "环境变量"}
                  </span>
                </div>
              )}
            </Label>
            <div className="relative">
              <Input
                type={showGithubToken ? "text" : "password"}
                placeholder="ghp_..."
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowGithubToken(!showGithubToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showGithubToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              在 GitHub &rarr; Settings &rarr; Developer settings &rarr;
              Personal access tokens (classic) 创建。
              <strong> 同步 Stars 功能必须提供此 Token。</strong>
            </p>
          </div>

          {!githubStatus.configured && (
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                未检测到 GitHub Token。请在上方输入后保存，否则无法同步
                GitHub Stars。
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automation Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>自动化偏好</CardTitle>
          <CardDescription>配置同步时的自动化行为</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors">
            <div>
              <p className="font-medium text-sm">自动生成 AI 描述</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                同步书签/Stars 时自动为无描述的条目生成 AI 描述
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoDescription}
              onChange={(e) => setAutoDescription(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors">
            <div>
              <p className="font-medium text-sm">自动保存快照</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                每次同步后自动保存书签列表的 JSON 快照
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoSnapshot}
              onChange={(e) => setAutoSnapshot(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
          </label>
        </CardContent>
      </Card>

      {/* Save button at bottom too */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          保存所有设置
        </Button>
      </div>
    </div>
  );
}
