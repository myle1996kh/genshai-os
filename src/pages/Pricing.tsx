import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Zap, Shield, Crown, Star } from "lucide-react";
import Navigation from "@/components/Navigation";

const plans = [
  {
    slug: "free",
    name: "Free",
    price_monthly: 0,
    price_yearly: 0,
    description: "Bắt đầu khám phá trí tuệ của các vĩ nhân",
    icon: Star,
    features: [
      "5 sessions / tháng",
      "3 agents cơ bản",
      "Lịch sử chat cơ bản",
      "Không cần thẻ tín dụng",
    ],
    cta: "Bắt đầu miễn phí",
    highlight: false,
  },
  {
    slug: "pro_monthly",
    name: "Pro Monthly",
    price_monthly: 19.99,
    price_yearly: 0,
    description: "Trải nghiệm đầy đủ không giới hạn",
    icon: Zap,
    features: [
      "Không giới hạn sessions",
      "Tất cả 6 agents",
      "Knowledge Ingestion (URL/Text)",
      "Lịch sử chat vĩnh viễn",
      "Ưu tiên phản hồi AI",
      "Hỗ trợ email",
    ],
    cta: "Nâng cấp Pro",
    highlight: true,
  },
  {
    slug: "pro_yearly",
    name: "Pro Yearly",
    price_monthly: 13.33,
    price_yearly: 159.99,
    description: "Tiết kiệm 33% khi trả năm",
    icon: Crown,
    features: [
      "Tất cả tính năng Pro Monthly",
      "Tiết kiệm $80 / năm",
      "Không giới hạn sessions",
      "Tất cả 6 agents",
      "Knowledge Ingestion",
      "Hỗ trợ ưu tiên",
    ],
    cta: "Nâng cấp Yearly",
    highlight: false,
    badge: "Tiết kiệm 33%",
  },
];

export default function Pricing() {
  const { user, subscription, isPro } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const currentPlan = subscription?.plan_slug || "free";

  const handleSelectPlan = async (planSlug: string) => {
    if (planSlug === "free") {
      navigate("/library");
      return;
    }
    if (!user) {
      navigate("/signup");
      return;
    }
    if (currentPlan === planSlug && isPro()) {
      navigate("/billing");
      return;
    }

    setLoadingPlan(planSlug);
    try {
      const { data, error } = await supabase.functions.invoke("create-paypal-subscription", {
        body: { plan_slug: planSlug },
      });
      if (error || !data?.approval_url) throw new Error(error?.message || "Không thể tạo subscription");
      window.location.href = data.approval_url;
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Có lỗi xảy ra. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const isCurrentPlan = (slug: string) => currentPlan === slug;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="os-tag mb-4 inline-block">Định giá</span>
            <h1 className="font-display text-4xl md:text-5xl text-foreground mb-4">
              Chọn hành trình của bạn
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Học từ những bộ óc vĩ đại nhất lịch sử. Bắt đầu miễn phí, nâng cấp khi bạn sẵn sàng.
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrent = isCurrentPlan(plan.slug);
              const isLoading = loadingPlan === plan.slug;

              return (
                <div
                  key={plan.slug}
                  className={`relative rounded-2xl p-6 flex flex-col transition-all duration-300 ${
                    plan.highlight
                      ? "glass-strong border border-primary/40 glow-gold"
                      : "glass border border-border"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="gradient-gold text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                        Phổ biến nhất
                      </span>
                    </div>
                  )}
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold px-4 py-1 rounded-full">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                      plan.highlight ? "gradient-gold" : "bg-muted"
                    }`}>
                      <Icon className={`w-5 h-5 ${plan.highlight ? "text-primary-foreground" : "text-primary"}`} />
                    </div>

                    <h3 className="font-display text-xl text-foreground mb-1">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>

                    <div className="flex items-end gap-1">
                      <span className="font-display text-4xl text-foreground">
                        ${plan.slug === "pro_yearly" ? plan.price_monthly.toFixed(2) : plan.price_monthly}
                      </span>
                      {plan.price_monthly > 0 && (
                        <span className="text-muted-foreground text-sm pb-1">/ tháng</span>
                      )}
                    </div>
                    {plan.slug === "pro_yearly" && (
                      <p className="text-muted-foreground text-xs mt-1">
                        ${plan.price_yearly} / năm • thanh toán một lần
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
                          plan.highlight ? "bg-primary/20" : "bg-muted"
                        }`}>
                          <Check className={`w-2.5 h-2.5 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <span className="text-sm text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelectPlan(plan.slug)}
                    disabled={isLoading || isCurrent}
                    className={`w-full h-11 font-semibold transition-all ${
                      isCurrent
                        ? "bg-muted text-muted-foreground cursor-default border border-border"
                        : plan.highlight
                        ? "gradient-gold text-primary-foreground hover:opacity-90"
                        : "border border-primary text-primary hover:bg-primary/10"
                    }`}
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-current/40 border-t-current rounded-full animate-spin" />
                    ) : isCurrent ? (
                      "Gói hiện tại"
                    ) : (
                      plan.cta
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* PayPal Trust Badge */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 glass rounded-full px-6 py-3">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Thanh toán an toàn qua <strong className="text-foreground">PayPal</strong> · Hủy bất cứ lúc nào · Không có phí ẩn
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
