import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import {
  CreditCard, Calendar, ExternalLink, AlertTriangle,
  Crown, CheckCircle2, XCircle, Clock, User, LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  active: { label: "Đang hoạt động", icon: CheckCircle2, color: "text-green-400" },
  trialing: { label: "Đang dùng thử", icon: Clock, color: "text-primary" },
  past_due: { label: "Quá hạn thanh toán", icon: AlertTriangle, color: "text-yellow-400" },
  canceled: { label: "Đã hủy", icon: XCircle, color: "text-destructive" },
  incomplete: { label: "Chưa hoàn tất", icon: AlertTriangle, color: "text-muted-foreground" },
};

function BillingContent() {
  const { user, profile, subscription, isPro, signOut, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-paypal-portal", {});
      if (error || !data?.portal_url) throw new Error(error?.message || "Không thể mở cổng quản lý");
      window.open(data.portal_url, "_blank");
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Bạn có chắc muốn hủy subscription? Bạn vẫn có thể dùng Pro đến hết kỳ thanh toán hiện tại.")) return;
    setCancelLoading(true);
    try {
      const { error } = await supabase.functions.invoke("cancel-paypal-subscription", {});
      if (error) throw new Error(error.message);
      await refreshSubscription();
      toast({
        title: "Đã hủy subscription",
        description: "Bạn vẫn có thể dùng Pro đến hết kỳ thanh toán hiện tại.",
      });
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const statusInfo = subscription ? (statusConfig[subscription.status] ?? statusConfig.incomplete) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="font-display text-3xl text-foreground mb-1">Tài khoản & Thanh toán</h1>
            <p className="text-muted-foreground text-sm">Quản lý subscription và thông tin cá nhân</p>
          </div>

          {/* Profile Card */}
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Thông tin cá nhân
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Tên</span>
                <span className="text-sm text-foreground font-medium">{profile?.full_name || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm text-foreground font-medium">{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Subscription Card */}
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                Subscription
              </h2>
              <SubscriptionBadge />
            </div>

            {subscription && statusInfo ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  {/* Status */}
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Trạng thái</span>
                    <span className={`text-sm font-medium flex items-center gap-1.5 ${statusInfo.color}`}>
                      <statusInfo.icon className="w-3.5 h-3.5" />
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Plan */}
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Gói</span>
                    <span className="text-sm text-foreground font-medium capitalize">
                      {subscription.plan_slug === "pro_monthly" ? "Pro Monthly"
                        : subscription.plan_slug === "pro_yearly" ? "Pro Yearly"
                        : "Free"}
                    </span>
                  </div>

                  {/* Period end */}
                  {subscription.current_period_end && (
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">
                        {subscription.cancel_at_period_end ? "Hết hạn vào" : "Gia hạn vào"}
                      </span>
                      <span className="text-sm text-foreground font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {new Date(subscription.current_period_end).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  )}

                  {/* Cancel notice */}
                  {subscription.cancel_at_period_end && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <p className="text-xs text-yellow-200">
                        Subscription sẽ hủy vào cuối kỳ thanh toán. Bạn vẫn có thể dùng Pro cho đến lúc đó.
                      </p>
                    </div>
                  )}

                  {/* Past due notice */}
                  {subscription.status === "past_due" && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                      <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                      <p className="text-xs text-destructive">
                        Thanh toán thất bại. Vui lòng cập nhật thông tin thanh toán để tiếp tục dùng Pro.
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {isPro() && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      className="flex-1 border-border hover:border-primary transition-colors"
                      variant="outline"
                    >
                      {portalLoading ? (
                        <div className="w-4 h-4 border-2 border-current/40 border-t-current rounded-full animate-spin mr-2" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      Quản lý thanh toán PayPal
                      <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
                    </Button>

                    {!subscription.cancel_at_period_end && (
                      <Button
                        onClick={handleCancelSubscription}
                        disabled={cancelLoading}
                        variant="outline"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        {cancelLoading ? (
                          <div className="w-4 h-4 border-2 border-current/40 border-t-current rounded-full animate-spin" />
                        ) : (
                          "Hủy subscription"
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {!isPro() && (
                  <Link to="/pricing">
                    <Button className="w-full gradient-gold text-primary-foreground font-semibold">
                      <Crown className="w-4 h-4 mr-2" />
                      Nâng cấp lên Pro
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-4">Bạn đang dùng gói miễn phí</p>
                <Link to="/pricing">
                  <Button className="gradient-gold text-primary-foreground font-semibold">
                    Xem các gói Pro
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Sign Out */}
          <div className="glass rounded-2xl p-4">
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Billing() {
  return (
    <ProtectedRoute>
      <BillingContent />
    </ProtectedRoute>
  );
}
