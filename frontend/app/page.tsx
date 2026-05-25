"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain,
  Upload,
  FileText,
  Target,
  BarChart3,
  Sparkles,
  Check,
  ArrowRight,
  Star,
} from "lucide-react";
import { LandingNav } from "@/components/layout/landing-nav";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  { icon: Upload, title: "Smart Uploads", desc: "PDF, DOCX, images with OCR extraction" },
  { icon: FileText, title: "AI Notes", desc: "Summaries, key points, revision notes with LaTeX" },
  { icon: Brain, title: "Adaptive Quizzes", desc: "MCQs and theory questions from your materials" },
  { icon: Target, title: "Weak Topic Tracking", desc: "Identify and improve low-accuracy subjects" },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Exam readiness score and performance trends" },
  { icon: Sparkles, title: "Past Paper AI", desc: "Pattern analysis and predicted exam questions" },
];

const testimonials = [
  { name: "Priya S.", role: "CSE, Sem 6", text: "StudyMind turned my messy PDFs into revision notes in minutes." },
  { name: "Arjun M.", role: "ECE, Sem 4", text: "The quiz system actually targets my weak topics. Game changer." },
  { name: "Sneha K.", role: "MBA", text: "Past paper analysis helped me predict 3 questions correctly." },
];

const faqs = [
  { q: "Is StudyMind AI free?", a: "We offer a generous free tier powered by DeepSeek via OpenRouter." },
  { q: "What file types are supported?", a: "PDF, DOCX, images, screenshots, and text files." },
  { q: "Is my data secure?", a: "Yes. Files are stored in Supabase with row-level security." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />

      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 text-center lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
              <Sparkles className="h-4 w-4" /> AI Academic Intelligence Platform
            </span>
            <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
              Study smarter with{" "}
              <span className="gradient-text">personalized AI</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Upload materials, generate notes, ace quizzes, track weak topics, and build exam-ready roadmaps — built for university students.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup"><Button size="lg" variant="gradient">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
              <Link href="/login"><Button size="lg" variant="outline">Sign In</Button></Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="mb-4 text-center text-3xl font-bold">Everything you need to excel</h2>
          <p className="mb-12 text-center text-muted-foreground">Not a chatbot — a complete academic intelligence system</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                <Card className="glass h-full transition-transform hover:scale-[1.02]">
                  <CardHeader>
                    <f.icon className="mb-2 h-8 w-8 text-primary" />
                    <CardTitle>{f.title}</CardTitle>
                    <CardDescription>{f.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/50 bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-bold">Loved by students</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.name} className="glass">
                <CardContent className="pt-6">
                  <div className="mb-3 flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground">&ldquo;{t.text}&rdquo;</p>
                  <p className="mt-4 font-semibold">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
          <h2 className="mb-4 text-3xl font-bold">Simple pricing</h2>
          <p className="mb-12 text-muted-foreground">Start free, upgrade when you need more</p>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <Card className="glass text-left">
              <CardHeader><CardTitle>Free</CardTitle><CardDescription>For getting started</CardDescription></CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <ul className="mt-6 space-y-2 text-sm">
                  {["5 uploads/month", "AI summaries", "Daily quizzes", "Basic analytics"].map((x) => (
                    <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{x}</li>
                  ))}
                </ul>
                <Link href="/signup"><Button className="mt-6 w-full" variant="outline">Get Started</Button></Link>
              </CardContent>
            </Card>
            <Card className="glass border-primary/50 text-left">
              <CardHeader><CardTitle className="gradient-text">Pro</CardTitle><CardDescription>Coming soon</CardDescription></CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">$9<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <ul className="mt-6 space-y-2 text-sm">
                  {["Unlimited uploads", "Past paper AI", "Handwriting mode", "Priority AI"].map((x) => (
                    <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{x}</li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" variant="gradient" disabled>Notify Me</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="faq" className="py-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-bold">FAQ</h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <Card key={f.q} className="glass"><CardHeader><CardTitle className="text-lg">{f.q}</CardTitle><CardDescription className="text-base text-foreground/80">{f.a}</CardDescription></CardHeader></Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-12 text-center text-white">
          <h2 className="text-3xl font-bold">Ready to transform your studies?</h2>
          <p className="mt-4 opacity-90">Join thousands of students using AI to prepare smarter.</p>
          <Link href="/signup"><Button size="lg" className="mt-8 bg-white text-violet-700 hover:bg-white/90">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
        </div>
      </section>

      <footer className="border-t border-border/50 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 md:flex-row lg:px-8">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} StudyMind AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
