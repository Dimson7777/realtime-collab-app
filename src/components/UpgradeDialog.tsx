import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Check, Loader2, CreditCard, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRO_FEATURES = [
  "Unlimited rooms",
  "Priority real-time sync",
  "Live cursors with name labels",
  "Auto-save with version history",
  "Premium support",
];

export const UpgradeDialog = ({ open, onOpenChange }: UpgradeDialogProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<"plans" | "checkout" | "success">("plans");
  const [processing, setProcessing] = useState(false);
  const [card, setCard] = useState({ number: "4242 4242 4242 4242", exp: "12 / 28", cvc: "123" });

  const reset = () => {
    setStep("plans");
    setProcessing(false);
  };

  const handleCheckout = async () => {
    if (!user) return;
    setProcessing(true);
    // Simulate Stripe processing
    await new Promise((r) => setTimeout(r, 1400));
    const { error } = await supabase.from("profiles").update({ plan: "pro" }).eq("user_id", user.id);
    setProcessing(false);
    if (error) {
      console.error("Plan update failed:", error);
      toast.error("Payment failed. Please try again.");
      return;
    }
    await refreshProfile();
    setStep("success");
    toast.success("Welcome to Pro.");
  };

  const handleCancel = async () => {
    if (!user) return;
    setProcessing(true);
    const { error } = await supabase.from("profiles").update({ plan: "free" }).eq("user_id", user.id);
    setProcessing(false);
    if (error) {
      console.error("Cancel failed:", error);
      toast.error("Could not cancel. Please try again.");
      return;
    }
    await refreshProfile();
    toast.success("Subscription cancelled. Your plan is now Free.");
    onOpenChange(false);
  };

  const close = (val: boolean) => {
    onOpenChange(val);
    if (!val) setTimeout(reset, 250);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {step === "plans" && (
          <div className="relative">
            {/* Subtle glow on Pro card */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-aurora/5 opacity-70" aria-hidden />
            <div className="relative px-6 pt-6 pb-5 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-medium uppercase tracking-wider text-primary">
                  {profile?.plan === "pro" ? "Your plan" : "Pro"}
                </div>
                {profile?.plan === "pro" ? (
                  <span className="rounded-full bg-aurora/10 text-aurora ring-1 ring-aurora/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
                    Most teams upgrade
                  </span>
                )}
              </div>
              <DialogHeader className="mt-2">
                <DialogTitle className="font-display text-xl font-semibold">
                  {profile?.plan === "pro" ? "You're on Pro" : "Unlock unlimited rooms"}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-3xl font-semibold">€9</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              {profile?.plan !== "pro" && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Used by fast-moving teams shipping every week.
                </p>
              )}
            </div>

            <div className="relative px-6 py-5 space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm">
                  <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                  <span className="text-foreground/90">{f}</span>
                </div>
              ))}
            </div>

            <div className="relative px-6 pb-6">
              {profile?.plan === "pro" ? (
                <>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleCancel}
                    disabled={processing}
                  >
                    {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Cancelling…</> : "Cancel subscription"}
                  </Button>
                  <p className="mt-3 text-center text-[11px] text-muted-foreground">
                    Your rooms will stay. The Free plan limit returns after cancelling.
                  </p>
                </>
              ) : (
                <>
                  <Button variant="primary" size="lg" className="w-full" onClick={() => setStep("checkout")}>
                    <CreditCard className="h-4 w-4" />
                    Continue to checkout
                  </Button>
                  <p className="mt-3 text-center text-[11px] text-muted-foreground">
                    Cancel anytime. Secure simulated checkout — no real charge.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {step === "checkout" && (
          <div className="px-6 py-6">
            <DialogHeader>
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                <Lock className="h-4 w-4 text-aurora" /> Secure checkout
              </DialogTitle>
            </DialogHeader>

            <div className="mt-5 rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sync Pro</span>
                <span className="font-semibold">€9.00 / mo</span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Card number</label>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={card.number}
                    onChange={(e) => setCard({ ...card, number: e.target.value })}
                    className="flex-1 bg-transparent text-sm font-mono focus:outline-none"
                    disabled={processing}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Expiry</label>
                  <input
                    value={card.exp}
                    onChange={(e) => setCard({ ...card, exp: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-mono focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={processing}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">CVC</label>
                  <input
                    value={card.cvc}
                    onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-mono focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={processing}
                  />
                </div>
              </div>
            </div>

            <Button variant="primary" size="lg" className="mt-6 w-full" onClick={handleCheckout} disabled={processing}>
              {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing payment…</> : <>Pay €9.00</>}
            </Button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-aurora" />
              This is a simulated checkout. No real payment will be made.
            </div>

            <button
              onClick={() => setStep("plans")}
              disabled={processing}
              className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              ← Back to plan
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-aurora/10 ring-1 ring-aurora/30">
              <Check className="h-5 w-5 text-aurora" strokeWidth={2.5} />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold">You're on Pro</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Unlimited rooms unlocked. Start creating without limits.
            </p>
            <Button variant="primary" size="lg" className="mt-6 w-full" onClick={() => close(false)}>
              Start collaborating
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
