import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Key, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ApiGuidePage() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl">
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 mb-2">Documentation</Badge>
          <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1 mb-2">Essential</Badge>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          API Configuration Guide
        </h1>
        <p className="text-xl text-muted-foreground">
          Learn how to obtain and configure API keys for various AI services to unlock the full potential of Miyasensei.
        </p>
      </div>

      <Alert className="mb-8 bg-blue-50/10 border-blue-500/20 text-blue-500">
        <div className="flex items-start gap-4">
          <Key className="h-5 w-5 mt-0.5" />
          <div>
            <AlertTitle className="text-foreground">Where to enter these keys?</AlertTitle>
            <AlertDescription className="mt-1 text-muted-foreground">
              Once you have your API keys, click the <strong className="text-foreground">Settings (Gear Icon)</strong> in the top right corner of the application to save them. Your keys are stored locally in your browser.
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <Tabs defaultValue="llm" className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-5 h-auto p-1">
          <TabsTrigger value="llm" className="py-2.5">LLM (Chat)</TabsTrigger>
          <TabsTrigger value="image" className="py-2.5">Image Gen</TabsTrigger>
          <TabsTrigger value="video" className="py-2.5">Video Gen</TabsTrigger>
          <TabsTrigger value="voice" className="py-2.5">Voice (TTS)</TabsTrigger>
          <TabsTrigger value="search" className="py-2.5">Web Search</TabsTrigger>
        </TabsList>

        <TabsContent value="llm" className="space-y-6">
          <div className="prose dark:prose-invert max-w-none mb-6">
            <h3>Language Models</h3>
            <p>
              Miyasensei supports multiple LLM providers. You only need to configure the ones you intend to use.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <ProviderCard
              title="OpenAI"
              description="GPT-4o, GPT-3.5 Turbo"
              url="https://platform.openai.com/api-keys"
              steps={[
                "Log in to OpenAI Platform",
                "Navigate to API Keys section",
                "Click 'Create new secret key'",
                "Copy the key immediately (sk-...)"
              ]}
              badge="Recommended"
            />
            <ProviderCard
              title="Anthropic"
              description="Claude 3.5 Sonnet, Opus"
              url="https://console.anthropic.com/settings/keys"
              steps={[
                "Sign up for Anthropic Console",
                "Go to Settings > API Keys",
                "Create a Key",
                "Copy the key (sk-ant-...)"
              ]}
            />
            <ProviderCard
              title="Google Gemini"
              description="Gemini 1.5 Pro, Flash"
              url="https://aistudio.google.com/app/apikey"
              steps={[
                "Go to Google AI Studio",
                "Click 'Get API key'",
                "Create key in new or existing project",
                "Copy the key"
              ]}
            />
             <ProviderCard
              title="DeepSeek"
              description="DeepSeek V3, R1"
              url="https://platform.deepseek.com/api_keys"
              steps={[
                "Register on DeepSeek Platform",
                "Go to API Keys",
                "Create and copy your key"
              ]}
            />
             <ProviderCard
              title="Volcano Engine (Doubao)"
              description="Doubao Pro/Lite"
              url="https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey"
              steps={[
                "Log in to Volcengine Console",
                "Navigate to ARK (ModelaaS)",
                "Create an API Key",
                "Ensure you have authorized the models"
              ]}
              badge="CN Optimized"
            />
          </div>
        </TabsContent>

        <TabsContent value="image" className="space-y-6">
          <div className="prose dark:prose-invert max-w-none mb-6">
            <h3>Image Generation</h3>
            <p>Generate visuals for your classroom materials.</p>
          </div>
          
           <div className="grid md:grid-cols-2 gap-6">
            <ProviderCard
              title="Seedream (Doubao)"
              description="By ByteDance/Volcengine"
              url="https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey"
              steps={[
                "Same as Doubao LLM key",
                "Ensure 'Seedream' model is added to your endpoint",
                "Copy the API Key"
              ]}
              badge="High Quality"
            />
            <ProviderCard
              title="Qwen Image"
              description="Wanx / Tongyi Wanxiang"
              url="https://dashscope.console.aliyun.com/apiKey"
              steps={[
                "Log in to Aliyun DashScope",
                "Create an API Key",
                "Ensure Qwen-VL/Image service is active"
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="video" className="space-y-6">
          <div className="prose dark:prose-invert max-w-none mb-6">
            <h3>Video Generation</h3>
            <p>Create short educational clips and animations.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <ProviderCard
              title="Seedance (Doubao)"
              description="By ByteDance/Volcengine"
              url="https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey"
              steps={[
                "Uses the same ARK API Key",
                "Add 'Seedance' capability to your project"
              ]}
            />
            <ProviderCard
              title="Kling AI"
              description="Kuaishou Kling"
              url="https://klingai.com/api"
              steps={[
                "Sign up for Kling AI API",
                "Generate access token/key",
                "Configure in settings"
              ]}
              badge="Realistic"
            />
          </div>
        </TabsContent>

         <TabsContent value="voice" className="space-y-6">
          <div className="prose dark:prose-invert max-w-none mb-6">
            <h3>Text-to-Speech (TTS)</h3>
            <p>Give voice to your AI agents.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <ProviderCard
              title="OpenAI TTS"
              description="Standard & HD Voices"
              url="https://platform.openai.com/api-keys"
              steps={[
                "Uses your OpenAI API Key",
                "No extra setup needed if LLM key is set"
              ]}
            />
             <ProviderCard
              title="Azure Speech"
              description="Microsoft Azure Cognitive Services"
              url="https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices"
              steps={[
                "Create Speech Service resource in Azure",
                "Go to 'Keys and Endpoint'",
                "Copy Key 1 and Region"
              ]}
            />
             <ProviderCard
              title="ElevenLabs"
              description="Premium AI Voices"
              url="https://elevenlabs.io/app/settings/api-keys"
              steps={[
                "Profile > API Keys",
                "Create and copy key"
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <div className="prose dark:prose-invert max-w-none mb-6">
            <h3>Web Search</h3>
            <p>Enable live internet access for your agents.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
             <ProviderCard
              title="Google Custom Search"
              description="Real-time search results"
              url="https://developers.google.com/custom-search/v1/overview"
              steps={[
                "Get API Key from Google Cloud Console",
                "Create Search Engine (CX ID) at cse.google.com",
                "Enter both Key and CX ID"
              ]}
            />
             <ProviderCard
              title="Bing Search"
              description="Microsoft Bing V7"
              url="https://portal.azure.com/#create/Microsoft.BingSearch"
              steps={[
                "Create Bing Search v7 resource in Azure",
                "Copy Key 1",
                "No CX ID needed"
              ]}
            />
             <ProviderCard
              title="Tavily"
              description="Search optimized for AI agents"
              url="https://tavily.com/"
              steps={[
                "Sign up at Tavily",
                "Copy API Key from dashboard"
              ]}
              badge="Easiest"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProviderCard({ 
  title, 
  description, 
  url, 
  steps, 
  badge 
}: { 
  title: string; 
  description: string; 
  url: string; 
  steps: string[];
  badge?: string;
}) {
  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow border-muted/60">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{title}</CardTitle>
          {badge && <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{badge}</Badge>}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <ul className="space-y-2 flex-1">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{step}</span>
            </li>
          ))}
        </ul>
        <Button variant="outline" className="w-full mt-auto group" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            Get API Key
            <ExternalLink className="ml-2 h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}