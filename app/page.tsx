'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  BookOpen, 
  BrainCircuit, 
  MessageSquareText, 
  Sparkles, 
  GraduationCap, 
  PlayCircle,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/hooks/use-i18n';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { setLocale, locale } = useI18n();

  return (
    // Clean, white theme
    <div className="min-h-screen w-full bg-white text-slate-900 overflow-x-hidden selection:bg-blue-100 selection:text-blue-900 font-sans">
      
      {/* ═══ Background Decor (Subtle & Light) ═══ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid pattern overlay (Very subtle gray) */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        {/* Glows (Pastel/Soft) */}
        <div
          className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-100/60 rounded-[100%] blur-[100px] animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-100/50 rounded-full blur-[120px]" />
      </div>

      {/* ═══ Navbar ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
             <div className="relative">
                <img src="/logo-horizontal.jpeg" alt="Logo" className="relative h-8 w-auto rounded-lg shadow-sm" />
             </div>
             <span className="font-bold text-lg tracking-tight text-slate-900">
               Sensei
             </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">How it Works</Link>
            <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</Link>
            <Link href="#use-cases" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Use Cases</Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              {locale === 'zh-CN' ? 'EN' : 'CN'}
            </button>
            <Link href="/dashboard">
              <Button size="sm" className="rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg transition-all">
                Launch App
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-slate-600 hover:text-slate-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-4 shadow-lg">
            <Link href="#how-it-works" className="block text-sm font-medium text-slate-600 hover:text-slate-900" onClick={() => setMobileMenuOpen(false)}>How it Works</Link>
            <Link href="#features" className="block text-sm font-medium text-slate-600 hover:text-slate-900" onClick={() => setMobileMenuOpen(false)}>Features</Link>
            <Link href="#use-cases" className="block text-sm font-medium text-slate-600 hover:text-slate-900" onClick={() => setMobileMenuOpen(false)}>Use Cases</Link>
            <div className="pt-4 border-t border-slate-100">
              <Link href="/dashboard">
                <Button className="w-full rounded-full bg-slate-900 hover:bg-slate-800 text-white">Launch App</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>
      
      {/* ═══ Hero Section ═══ */}
      <section className="relative pt-32 pb-32 px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium rounded-full border-blue-200 bg-blue-50 text-blue-700 shadow-sm">
            <Sparkles className="w-3 h-3 mr-2 inline-block text-blue-500" />
            AI-Powered Interactive Learning
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-slate-900">
            Learn anything with <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">AI teachers</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-xl text-slate-600 mb-10 leading-relaxed">
            Sensei transforms any topic or document into a <span className="text-slate-900 font-medium">complete interactive classroom</span>. 
            Experience adaptive curriculums, real-time explanations, and personalized evaluations.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/dashboard">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-slate-900 hover:bg-slate-800 text-white border-0 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                Start Learning
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-slate-200 bg-white hover:bg-slate-50 text-slate-900 shadow-sm hover:shadow">
                How it works
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ═══ Product Preview / Value Prop ═══ */}
      <section id="features" className="py-24 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">Not just content delivery. <br/>A <span className="text-purple-600">complete learning system</span>.</h2>
                <p className="text-slate-600 text-lg">
                  Traditional learning is fragmented. Sensei builds a structured curriculum just for you, 
                  adapting to your pace and style in real-time.
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="flex gap-4 group">
                  <div className="bg-white p-3 rounded-xl h-fit border border-slate-200 shadow-sm group-hover:border-blue-200 group-hover:shadow-md transition-all">
                    <BrainCircuit className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">Adaptive Curriculum</h3>
                    <p className="text-slate-600">Automatically generates structured lessons, summaries, and deep-dives based on your input.</p>
                  </div>
                </div>
                
                <div className="flex gap-4 group">
                  <div className="bg-white p-3 rounded-xl h-fit border border-slate-200 shadow-sm group-hover:border-purple-200 group-hover:shadow-md transition-all">
                    <MessageSquareText className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">Real-time AI Tutor</h3>
                    <p className="text-slate-600">Review concepts, ask follow-up questions, and get instant feedback through natural conversation.</p>
                  </div>
                </div>

                <div className="flex gap-4 group">
                  <div className="bg-white p-3 rounded-xl h-fit border border-slate-200 shadow-sm group-hover:border-cyan-200 group-hover:shadow-md transition-all">
                    <GraduationCap className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">Interactive Evaluation</h3>
                    <p className="text-slate-600">Test your understanding with generated quizzes that explain *why* an answer is right or wrong.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Abstract UI Representation */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
               <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl blur-lg opacity-20"></div>
               <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden aspect-video flex flex-col">
                  {/* Mock Window Header */}
                  <div className="h-10 border-b border-slate-100 bg-slate-50 flex items-center px-4 gap-2">
                     <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                     <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                     <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                     <div className="ml-4 h-5 w-64 bg-white rounded-full border border-slate-200/50 shadow-sm"></div>
                  </div>
                  {/* Mock Content */}
                  <div className="flex-1 flex overflow-hidden">
                     {/* Left Panel: Teacher */}
                     <div className="w-1/3 border-r border-slate-100 p-4 flex flex-col gap-4 bg-slate-50/50">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 mx-auto mb-2 opacity-90 shadow-md ring-2 ring-white"></div>
                        <div className="space-y-3">
                           <div className="h-2 w-3/4 bg-slate-200 rounded animate-pulse"></div>
                           <div className="h-2 w-full bg-slate-200 rounded animate-pulse delay-75"></div>
                           <div className="h-2 w-5/6 bg-slate-200 rounded animate-pulse delay-150"></div>
                        </div>
                        <div className="mt-auto bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                           <div className="h-8 w-full bg-slate-50 rounded border border-slate-100 flex items-center px-3 text-xs text-slate-400">
                              Ask a question...
                           </div>
                        </div>
                     </div>
                     {/* Right Panel: Content */}
                     <div className="w-2/3 p-6 flex flex-col">
                        <div className="h-6 w-1/2 bg-slate-100 rounded mb-6"></div>
                        <div className="space-y-4">
                           <div className="h-32 w-full bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center">
                              <PlayCircle className="w-10 h-10 text-slate-300" />
                           </div>
                           <div className="space-y-2">
                              <div className="h-3 w-full bg-slate-100 rounded"></div>
                              <div className="h-3 w-full bg-slate-100 rounded"></div>
                              <div className="h-3 w-2/3 bg-slate-100 rounded"></div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section id="how-it-works" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200">Simple Process</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">How It Works</h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">From curiosity to mastery in three simple steps.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
           {[
             { title: "Input Topic", desc: "Type what you want to learn, or upload a document.", icon: <BookOpen className="w-8 h-8 text-blue-600"/>, color: "blue" },
             { title: "AI Builds Classroom", desc: "Sensei generates a syllabus, slides, and quizzes instantly.", icon: <BrainCircuit className="w-8 h-8 text-purple-600"/>, color: "purple" },
             { title: "Learn Interactively", desc: "Engage with the AI teacher, take quizzes, and track progress.", icon: <Sparkles className="w-8 h-8 text-cyan-600"/>, color: "cyan" },
           ].map((step, i) => (
             <Card key={i} className="relative overflow-hidden bg-white border-slate-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
               <CardHeader>
                 <div className={`mb-4 bg-${step.color}-50 w-16 h-16 rounded-2xl flex items-center justify-center border border-${step.color}-100`}>
                   {step.icon}
                 </div>
                 <CardTitle className="text-xl text-slate-900">{step.title}</CardTitle>
               </CardHeader>
               <CardContent>
                 <CardDescription className="text-base text-slate-600">{step.desc}</CardDescription>
               </CardContent>
             </Card>
           ))}
        </div>
      </section>

      {/* ═══ Use Cases ═══ */}
      <section id="use-cases" className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center text-slate-900">What will you learn today?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-default group">
              <CardHeader>
                <CardTitle className="text-slate-900 group-hover:text-blue-600 transition-colors">Public Speaking</CardTitle>
                <CardDescription className="text-slate-500">Master confidence, speech structure, and body language through AI simulations.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">Speech Structure</Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">Body Language</Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">Roleplay</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all cursor-default group">
              <CardHeader>
                <CardTitle className="text-slate-900 group-hover:text-purple-600 transition-colors">Personal Finance</CardTitle>
                <CardDescription className="text-slate-500">Get a customized plan for budgeting, investing, and risk management.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">Budgeting</Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">Investing</Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">Risk Mgmt</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 hover:border-cyan-300 hover:shadow-lg transition-all cursor-default group">
              <CardHeader>
                <CardTitle className="text-slate-900 group-hover:text-cyan-600 transition-colors">Critical Thinking</CardTitle>
                <CardDescription className="text-slate-500">Analyze logical fallacies and improve decision making with case studies.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">Logic</Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">Fallacies</Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">Case Studies</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══ CTA Closing ═══ */}
      <section className="py-32 px-6 text-center relative overflow-hidden bg-white">
        {/* Glow behind CTA */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-50 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-3xl mx-auto space-y-8 relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">Ready to start your journey?</h2>
          <p className="text-xl text-slate-600">Join thousands of learners transforming usage into mastery.</p>
          <Link href="/dashboard">
            <Button size="lg" className="h-16 px-10 text-xl rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:scale-105">
              Generate Your First Class
            </Button>
          </Link>
        </div>
      </section>
      
      {/* ═══ Footer ═══ */}
      <footer className="py-12 border-t border-slate-100 text-center text-slate-500 text-sm bg-white">
        <p>&copy; {new Date().getFullYear()} OpenMAIC / Sensei. All rights reserved.</p>
      </footer>
    </div>
  );
}
