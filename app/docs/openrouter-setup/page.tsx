'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, ArrowLeft, Key, CheckCircle2, Terminal, ShieldCheck, Zap, ArrowRight, LineChart, Globe, CreditCard, Github, Twitter } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

export default function OpenRouterSetupPage() {
  return (
    <div className="min-h-screen w-full bg-white text-slate-900 overflow-x-hidden selection:bg-blue-100 selection:text-blue-900 font-sans">
      
      {/* ═══ Background Decor (Subtle & Light) ═══ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid pattern overlay (Very subtle gray) */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        {/* Glows (Pastel/Soft) */}
        <div
          className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-100/60 rounded-[100%] blur-[100px] animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[120px]" />
      </div>

      {/* Navbar / Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-600 hover:text-slate-900">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-600 hover:text-slate-900">
              <Link href="https://x.com/miyasenseiai" target="_blank">
                <Twitter className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-600 hover:text-slate-900">
              <Link href="https://github.com/omnimasudo/miyasensei" target="_blank">
                <Github className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-24 space-y-24">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-8"
        >
          <div className="inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium border-purple-200 bg-purple-50 text-purple-700 shadow-sm">
            <Zap className="w-3 h-3 mr-2 text-purple-500" />
            Recommended Provider
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900">
            Connect <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">OpenRouter</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-xl text-slate-600 leading-relaxed">
            Unlock access to GPT-4, Claude 3, Llama 3, and 100+ other top-tier AI models with a single API key. No monthly subscriptions required.
          </p>
        </motion.section>

        {/* Primary Action Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-slate-200 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Zap className="w-24 h-24 text-purple-600" />
            </div>
            <CardContent className="p-8 lg:p-12 flex flex-col items-center gap-8 relative z-10 text-center">
              <div className="space-y-6 max-w-lg">
                <h2 className="text-3xl font-bold text-slate-900">Get Your API Key</h2>
                <p className="text-slate-600 text-lg leading-relaxed">
                  You&apos;ll need an OpenRouter account to generate a key. It takes less than 2 minutes to set up.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button asChild size="lg" className="h-12 px-8 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                    <Link href="https://openrouter.ai/keys" target="_blank">
                      Create Key on OpenRouter
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-slate-500 px-3">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <span>Secure & Private</span>
                  </div>
                </div>
              </div>
              {/* Visual Representation of a Key */}
              <div className="hidden md:block bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200 rotate-2 transform hover:rotate-0 transition-all duration-300">
                <div className="flex items-center gap-3 text-slate-600 font-mono text-sm">
                  <Key className="h-5 w-5 text-purple-500" />
                  <span>sk-or-v1-................</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Benefits Grid */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-y-12"
        >
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Why Choose OpenRouter?</h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">Access the world&apos;s best AI models through a single, unified platform.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="bg-white border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 h-full">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto bg-blue-50 p-3 rounded-xl w-fit border border-blue-100">
                    <Globe className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl text-slate-900">All Models</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-slate-600">Access OpenAI, Anthropic, Google, and open-source models without separate accounts.</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="bg-white border-slate-200 shadow-sm hover:shadow-lg hover:border-purple-200 transition-all duration-300 h-full">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto bg-purple-50 p-3 rounded-xl w-fit border border-purple-100">
                    <CreditCard className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl text-slate-900">Pay-as-you-go</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-slate-600">No recurring monthly fees. Only pay for the tokens you actually use.</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="bg-white border-slate-200 shadow-sm hover:shadow-lg hover:border-cyan-200 transition-all duration-300 h-full">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto bg-cyan-50 p-3 rounded-xl w-fit border border-cyan-100">
                    <LineChart className="h-6 w-6 text-cyan-600" />
                  </div>
                  <CardTitle className="text-xl text-slate-900">Unified Usage</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-slate-600">Track all your AI spending in one dashboard, regardless of which model you use.</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.section>

        {/* Step-by-Step Guide */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="space-y-16"
        >
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Setup Instructions</h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">Follow these simple steps to connect OpenRouter to MiyaSensei.</p>
          </div>

          <div className="space-y-16 relative max-w-3xl mx-auto">
            
            {/* Step 1 */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row items-center gap-8"
            >
              <div className="flex-shrink-0 w-20 h-20 rounded-full bg-white border-2 border-slate-200 shadow-lg flex items-center justify-center font-bold text-2xl text-slate-700">
                1
              </div>
              <div className="flex-1 space-y-4 text-center md:text-left">
                <h3 className="text-2xl font-bold text-slate-900">Sign in to OpenRouter</h3>
                <p className="text-slate-600 text-lg leading-relaxed">
                  Navigate to <Link href="https://openrouter.ai" className="text-blue-600 hover:underline font-medium" target="_blank">OpenRouter.ai</Link>. You can sign in with your Google account or a Web3 wallet. 
                  <br className="hidden md:block" /><span className="text-sm text-slate-500">No credit card is needed to start.</span>
                </p>
              </div>
            </motion.div>

            {/* Arrow */}
            <div className="flex justify-center text-slate-300">
               <ArrowRight className="h-8 w-8 rotate-90 hidden md:block" />
               <ArrowRight className="h-6 w-6 rotate-90 md:hidden" />
            </div>

            {/* Step 2 */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row-reverse items-center gap-8"
            >
              <div className="flex-shrink-0 w-20 h-20 rounded-full bg-white border-2 border-slate-200 shadow-lg flex items-center justify-center font-bold text-2xl text-slate-700">
                2
              </div>
              <div className="flex-1 space-y-4 text-center md:text-right">
                <h3 className="text-2xl font-bold text-slate-900">Create an API Key</h3>
                <p className="text-slate-600 text-lg leading-relaxed">
                  Go to the <strong>Keys</strong> section in your account dashboard. Click the &quot;Create Key&quot; button.
                </p>
                <div className="bg-slate-900 rounded-xl p-6 text-slate-200 font-mono text-sm shadow-lg max-w-sm mx-auto md:ml-auto md:mr-0">
                   <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-3">
                      <span className="font-semibold">Create Key</span>
                   </div>
                   <div className="space-y-3">
                      <div className="text-slate-400 text-xs uppercase tracking-wider">Name</div>
                      <div className="bg-slate-800 px-4 py-3 rounded-lg border border-slate-700 text-slate-100 font-medium">MiyaSensei</div>
                   </div>
                </div>
              </div>
            </motion.div>

            {/* Arrow */}
            <div className="flex justify-center text-slate-300">
               <ArrowRight className="h-8 w-8 rotate-90 hidden md:block" />
               <ArrowRight className="h-6 w-6 rotate-90 md:hidden" />
            </div>

            {/* Step 3 */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row items-center gap-8"
            >
              <div className="flex-shrink-0 w-20 h-20 rounded-full bg-white border-2 border-slate-200 shadow-lg flex items-center justify-center font-bold text-2xl text-slate-700">
                3
              </div>
              <div className="flex-1 space-y-4 text-center md:text-left">
                <h3 className="text-2xl font-bold text-slate-900">Copy & Paste</h3>
                <p className="text-slate-600 text-lg leading-relaxed">
                  <strong>Important:</strong> Copy the key immediately (starting with <code>sk-or-v1-</code>). You won&apos;t be able to see it again after you close the dialog.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-sm text-yellow-800 flex items-center gap-4 justify-center max-w-lg mx-auto shadow-sm">
                  <Terminal className="h-6 w-6 flex-shrink-0 text-yellow-600" />
                  <p className="font-medium">In MiyaSensei, go to <strong>Settings › Providers › OpenRouter</strong> and paste your key.</p>
                </div>
              </div>
            </motion.div>

            {/* Arrow */}
            <div className="flex justify-center text-slate-300">
               <ArrowRight className="h-8 w-8 rotate-90 hidden md:block" />
               <ArrowRight className="h-6 w-6 rotate-90 md:hidden" />
            </div>

             {/* Step 4 */}
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               className="flex flex-col items-center gap-8 text-center"
             >
              <div className="flex-shrink-0 w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 shadow-lg flex items-center justify-center font-bold text-2xl text-green-700">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-green-900">Verify Connection</h3>
                <p className="text-slate-600 text-lg leading-relaxed max-w-md mx-auto">
                  Click the <strong>Test Connection</strong> button in MiyaSensei settings. If successful, you&apos;re ready to start generating classrooms!
                </p>
              </div>
            </motion.div>
          </div>
        </motion.section>

      </main>
    </div>
  );
}
