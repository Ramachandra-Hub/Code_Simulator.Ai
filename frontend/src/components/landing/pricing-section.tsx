"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Starter",
    price: "₹49,999",
    period: "/year",
    features: ["Up to 500 students", "LMS & Coding Lab", "Basic Analytics", "Email Support"],
  },
  {
    name: "Professional",
    price: "₹1,49,999",
    period: "/year",
    popular: true,
    features: ["Up to 2,000 students", "AI Coach & Mock Interviews", "Placement Management", "ATS Analyzer", "Priority Support"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["Unlimited students", "Full platform access", "Custom integrations", "Dedicated success manager", "SLA guarantee"],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight">
            Simple, <span className="gradient-text">Transparent Pricing</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Choose the plan that fits your institution. All plans include core learning and coding features.
          </p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`glass-card relative ${plan.popular ? "border-primary/50 shadow-glow" : ""}`}
            >
              {plan.popular && (
                <Badge variant="gradient" className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle>{plan.name}</CardTitle>
                <p className="text-3xl font-bold mt-2">
                  {plan.price}
                  <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant={plan.popular ? "gradient" : "outline"} className="w-full" asChild>
                  <Link href="/login">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
