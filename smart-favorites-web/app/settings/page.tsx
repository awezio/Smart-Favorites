"use client";

import { useState, useEffect } from "react";
import { Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [githubToken, setGithubToken] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleSave = () => {
    // Note: In a real implementation, you'd need to update .env.local
    // This is just for demonstration
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    alert("设置已保存！请在 Vercel Dashboard 或 .env.local 中更新环境变量。");
  };

  if (!settings) {
    return <div>加载中...</div>;
  }

  const providers = [
    { id: "openai", name: "OpenAI", configured: settings.providers.openai },
    { id: "deepseek", name: "DeepSeek", configured: settings.providers.deepseek },
    { id: "kimi", name: "Kimi (月之暗面)", configured: settings.providers.kimi },
    { id: "qwen", name: "Qwen (通义千问)", configured: settings.providers.qwen },
    { id: "claude", name: "Claude", configured: settings.providers.claude },
    { id: "gemini", name: "Gemini", configured: settings.providers.gemini },
    { id: "glm", name: "GLM (智谱)", configured: settings.providers.glm },
    { id: "ollama", name: "Ollama", configured: settings.providers.ollama },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">设置</h1>
        <p className="text-muted-foreground mt-2">配置 AI 服务和 API 密钥</p>
      </div>

      {/* Current Settings */}
      <Card>
        <CardHeader>
          <CardTitle>当前配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <Label>默认 LLM Provider</Label>
            <p className="text-sm text-muted-foreground">{settings.defaultProvider}</p>
          </div>
          <div>
            <Label>Embedding 模型</Label>
            <p className="text-sm text-muted-foreground">{settings.embeddingModel}</p>
          </div>
        </CardContent>
      </Card>

      {/* AI Providers */}
      <Card>
        <CardHeader>
          <CardTitle>AI 服务提供商</CardTitle>
          <CardDescription>配置您的 AI API 密钥</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers.map((provider) => (
            <div key={provider.id} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-3">
                <span className="font-medium">{provider.name}</span>
                {provider.configured ? (
                  <Badge variant="default">
                    <Check className="h-3 w-3 mr-1" />
                    已配置
                  </Badge>
                ) : (
                  <Badge variant="outline">未配置</Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* API Key Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>配置 API 密钥</CardTitle>
          <CardDescription>
            ⚠️ 提示：API 密钥应在 Vercel Dashboard 的环境变量中配置，而不是在此页面。
            此页面仅用于查看配置状态。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded">
            <p className="text-sm">
              <strong>配置步骤：</strong>
            </p>
            <ol className="text-sm space-y-1 mt-2 ml-4 list-decimal">
              <li>登录 Vercel Dashboard</li>
              <li>进入项目设置 &gt; Environment Variables</li>
              <li>添加或更新 API 密钥（如 OPENAI_API_KEY）</li>
              <li>重新部署应用以应用更改</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* GitHub Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>GitHub 配置</CardTitle>
          <CardDescription>
            配置 GitHub Token 以提高 API 限制
            {settings.github.configured && (
              <Badge variant="default" className="ml-2">
                <Check className="h-3 w-3 mr-1" />
                已配置
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>GitHub Personal Access Token</Label>
            <Input
              type="password"
              placeholder="ghp_..."
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              在 GitHub Settings &gt; Developer settings &gt; Personal access tokens 创建
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saved}>
          {saved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              已保存
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              保存设置
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
