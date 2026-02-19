"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Github, Mail, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
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

/* ── Password strength helper ── */
function getPasswordStrength(pw: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: "弱", color: "bg-red-500" };
  if (score <= 2) return { score, label: "一般", color: "bg-orange-500" };
  if (score <= 3) return { score, label: "中等", color: "bg-yellow-500" };
  if (score <= 4) return { score, label: "强", color: "bg-green-500" };
  return { score, label: "非常强", color: "bg-emerald-600" };
}

/* ── Math captcha generator ── */
function generateCaptcha(): { question: string; answer: number } {
  const ops = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;
  switch (op) {
    case "+":
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      answer = a + b;
      break;
    case "-":
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    default: // ×
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      answer = a * b;
      break;
  }
  return { question: `${a} ${op} ${b} = ?`, answer };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Captcha state
  const [captcha, setCaptcha] = useState(() => generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
  }, []);

  // Refresh captcha when toggling login/register
  useEffect(() => {
    refreshCaptcha();
  }, [isLogin, refreshCaptcha]);

  const supabase = createClient();

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );
  const passwordsMatch = confirmPassword === password;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("请填写邮箱和密码");
      return;
    }

    // Registration-only validations
    if (!isLogin) {
      if (password !== confirmPassword) {
        toast.error("两次输入的密码不一致");
        return;
      }
      if (passwordStrength.score < 2) {
        toast.error("密码强度太弱，请使用更复杂的密码");
        return;
      }
      if (parseInt(captchaInput) !== captcha.answer) {
        toast.error("验证码答案不正确");
        refreshCaptcha();
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("登录成功");
        router.push(redirectTo);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`,
          },
        });
        if (error) throw error;
        toast.success("注册成功！请检查邮箱完成验证。");
      }
    } catch (error: any) {
      toast.error(error.message || "认证失败");
      if (!isLogin) refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "github" | "google") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`,
      },
    });

    if (error) {
      const msg = error.message || "";
      const notEnabled =
        msg.includes("not enabled") ||
        msg.includes("Unsupported provider") ||
        (error as any).error_code === "validation_failed";
      if (notEnabled) {
        toast.error(
          `${provider} 登录未在后台开启。请在 Supabase 控制台 → Authentication → Providers 中启用 ${provider} 并配置 Client ID/Secret。`
        );
      } else {
        toast.error(msg || `${provider} 登录失败`);
      }
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Logo */}
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
            SF
          </div>
          <span className="text-2xl font-bold">Smart Favorites</span>
        </Link>
        <p className="mt-2 text-muted-foreground">
          {isLogin ? "登录到你的智能收藏夹" : "创建你的智能收藏夹账号"}
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {isLogin ? "欢迎回来" : "注册账号"}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin ? "使用以下方式登录" : "选择注册方式开始使用"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => handleOAuthLogin("github")}
              disabled={loading}
              className="w-full"
            >
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOAuthLogin("google")}
              disabled={loading}
              className="w-full"
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                或使用邮箱
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="至少 6 位"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Password strength indicator (registration only) */}
              {!isLogin && password.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i <= passwordStrength.score
                            ? passwordStrength.color
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    密码强度：{passwordStrength.label}
                    {passwordStrength.score < 3 && (
                      <span className="ml-1">
                        (建议包含大写字母、数字和特殊字符)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password (registration only) */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-destructive">
                    两次输入的密码不一致
                  </p>
                )}
                {confirmPassword.length > 0 && passwordsMatch && (
                  <p className="text-xs text-green-600">密码一致</p>
                )}
              </div>
            )}

            {/* Math captcha (registration only) */}
            {!isLogin && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  安全验证
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 rounded-md bg-muted px-4 py-2 font-mono text-base font-semibold select-none tracking-wider">
                    {captcha.question}
                  </div>
                  <Input
                    type="number"
                    placeholder="答案"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    required
                    className="w-24"
                  />
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="text-xs text-primary hover:underline whitespace-nowrap"
                  >
                    换一题
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                loading ||
                (!isLogin &&
                  (!passwordsMatch ||
                    passwordStrength.score < 2 ||
                    !captchaInput))
              }
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {isLogin ? "登录" : "注册"}
            </Button>
          </form>

          {/* Toggle login/register */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "还没有账号？" : "已有账号？"}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setConfirmPassword("");
                setCaptchaInput("");
              }}
              className="ml-1 text-primary hover:underline font-medium"
            >
              {isLogin ? "注册" : "登录"}
            </button>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/" className="hover:underline">
          返回首页
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
