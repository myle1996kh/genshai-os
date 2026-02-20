import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const passwordStrength = () => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strengthColors = ["bg-destructive", "bg-destructive", "bg-yellow-500", "bg-green-500", "bg-green-600"];
  const strengthLabels = ["", "Yếu", "Trung bình", "Tốt", "Mạnh"];
  const strength = passwordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    if (error) {
      if (error.message.includes("already registered")) {
        setError("Email này đã được đăng ký. Hãy đăng nhập.");
      } else {
        setError(error.message);
      }
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="glass-strong rounded-2xl p-10">
            <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="font-display text-2xl text-foreground mb-3">Kiểm tra email của bạn!</h2>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Chúng tôi đã gửi link xác nhận đến <strong className="text-foreground">{email}</strong>.
              Nhấn vào link để kích hoạt tài khoản.
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="gradient-gold text-primary-foreground font-semibold"
            >
              Đến trang đăng nhập
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="font-display text-2xl text-gradient-gold">GenShai</span>
          </Link>
          <h1 className="font-display text-3xl text-foreground mt-4 mb-2">Tạo tài khoản</h1>
          <p className="text-muted-foreground text-sm">Bắt đầu hành trình miễn phí, không cần thẻ tín dụng</p>
        </div>

        <div className="glass-strong rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-foreground/80 text-sm">Họ và tên</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                required
                className="bg-muted/50 border-border focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-foreground/80 text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@example.com"
                required
                className="bg-muted/50 border-border focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-foreground/80 text-sm">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                  required
                  className="bg-muted/50 border-border focus:border-primary transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : "bg-muted"}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{strengthLabels[strength]}</p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-gold text-primary-foreground font-semibold h-11 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Tạo tài khoản
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Bằng cách đăng ký, bạn đồng ý với{" "}
              <span className="text-primary">Điều khoản dịch vụ</span>
            </p>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Đã có tài khoản?{" "}
            <Link to="/login" className="text-primary hover:text-accent font-medium transition-colors">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
