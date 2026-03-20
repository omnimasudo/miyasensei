'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUp,
  Check,
  ImagePlus,
  Pencil,
  Trash2,
  Settings,
  Sparkles,
  ChevronUp,
} from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { createLogger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Textarea as UITextarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SettingsDialog } from '@/components/settings';
import { GenerationToolbar } from '@/components/generation/generation-toolbar';
import { AgentBar } from '@/components/agent/agent-bar';
import { useTheme } from '@/lib/hooks/use-theme';
import { nanoid } from 'nanoid';
import { storePdfBlob } from '@/lib/utils/image-storage';
import type { UserRequirements } from '@/lib/types/generation';
import { useSettingsStore } from '@/lib/store/settings';
import { useUserProfileStore, AVATAR_OPTIONS } from '@/lib/store/user-profile';
import {
  StageListItem,
  listStages,
  deleteStageData,
  getFirstSlideByStages,
} from '@/lib/utils/stage-storage';
import { ThumbnailSlide } from '@/components/slide-renderer/components/ThumbnailSlide';
import type { Slide } from '@/lib/types/slides';
import { useMediaGenerationStore } from '@/lib/store/media-generation';
import { toast } from 'sonner';
import { useDraftCache } from '@/lib/hooks/use-draft-cache';
import { SpeechButton } from '@/components/audio/speech-button';

const log = createLogger('Home');

const WEB_SEARCH_STORAGE_KEY = 'webSearchEnabled';
const LANGUAGE_STORAGE_KEY = 'generationLanguage';

interface FormState {
  pdfFile: File | null;
  requirement: string;
  language: 'zh-CN' | 'en-US';
  webSearch: boolean;
}

const initialFormState: FormState = {
  pdfFile: null,
  requirement: '',
  language: 'zh-CN',
  webSearch: false,
};

function HomePage() {
  const { t, locale, setLocale } = useI18n();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<
    import('@/lib/types/settings').SettingsSection | undefined
  >(undefined);

  // Draft cache for requirement text
  const { cachedValue: cachedRequirement, updateCache: updateRequirementCache } =
    useDraftCache<string>({ key: 'requirementDraft' });

  // Model setup state
  const currentModelId = useSettingsStore((s) => s.modelId);
  const [storeHydrated, setStoreHydrated] = useState(false);

  // Hydrate client-only state after mount (avoids SSR mismatch)
  useEffect(() => {
    // Schedule state update to avoid synchronous setState warning
    const timer = setTimeout(() => {
      setStoreHydrated(true);
      try {
        const savedWebSearch = localStorage.getItem(WEB_SEARCH_STORAGE_KEY);
        const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        const updates: Partial<FormState> = {};
        if (savedWebSearch === 'true') updates.webSearch = true;
        if (savedLanguage === 'zh-CN' || savedLanguage === 'en-US') {
          updates.language = savedLanguage;
        } else {
          const detected = navigator.language?.startsWith('zh') ? 'zh-CN' : 'en-US';
          updates.language = detected;
        }
        if (Object.keys(updates).length > 0) {
          setForm((prev) => ({ ...prev, ...updates }));
        }
      } catch {
        /* localStorage unavailable */
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Restore requirement draft from cache
  useEffect(() => {
    if (cachedRequirement) {
      // Defer state update to avoid synchronous setState warning
      setTimeout(() => {
        setForm((prev) => ({ ...prev, requirement: cachedRequirement }));
      }, 0);
    }
  }, [cachedRequirement]);

  const needsSetup = storeHydrated && !currentModelId;
  const [languageOpen, setLanguageOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<StageListItem[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, Slide>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!languageOpen && !themeOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setLanguageOpen(false);
        setThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [languageOpen, themeOpen]);

  const loadClassrooms = useCallback(async () => {
    try {
      const list = await listStages();
      setClassrooms(list);
      // Load first slide thumbnails
      if (list.length > 0) {
        const slides = await getFirstSlideByStages(list.map((c) => c.id));
        setThumbnails(slides);
      }
    } catch (err) {
      log.error('Failed to load classrooms:', err);
    }
  }, []);

  useEffect(() => {
    useMediaGenerationStore.getState().revokeObjectUrls();
    useMediaGenerationStore.setState({ tasks: {} });
    // Execute data loading in next tick to satisfy linter constraints on effect side-effects
    setTimeout(() => {
      loadClassrooms();
    }, 0);
  }, [loadClassrooms]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(id);
  };

  const confirmDelete = async (id: string) => {
    setPendingDeleteId(null);
    try {
      await deleteStageData(id);
      await loadClassrooms();
    } catch (err) {
      log.error('Failed to delete classroom:', err);
      toast.error('Failed to delete classroom');
    }
  };

  const updateForm = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    try {
      if (field === 'webSearch') localStorage.setItem(WEB_SEARCH_STORAGE_KEY, String(value));
      if (field === 'language') localStorage.setItem(LANGUAGE_STORAGE_KEY, String(value));
      if (field === 'requirement') updateRequirementCache(value as string);
    } catch {
      /* ignore */
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const showSetupToast = (icon: React.ReactNode, title: string, desc: string) => {
    toast.custom(
      (id) => (
        <div
          className="w-[356px] rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-r from-amber-50 via-white to-amber-50 dark:from-amber-950/60 dark:via-slate-900 dark:to-amber-950/60 shadow-lg shadow-amber-500/8 dark:shadow-amber-900/20 p-4 flex items-start gap-3 cursor-pointer"
          onClick={() => {
            toast.dismiss(id);
            setSettingsOpen(true);
          }}
        >
          <div className="shrink-0 mt-0.5 size-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center ring-1 ring-amber-200/50 dark:ring-amber-800/30">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 leading-tight">
              {title}
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-0.5 leading-relaxed">
              {desc}
            </p>
          </div>
          <div className="shrink-0 mt-1 text-[10px] font-medium text-amber-500 dark:text-amber-500/70 tracking-wide">
            <Settings className="size-3.5 animate-[spin_3s_linear_infinite]" />
          </div>
        </div>
      ),
      { duration: 4000 },
    );
  };

  const handleGenerate = async () => {
    const canGenerate = form.requirement.trim().length > 0 || form.pdfFile;

    // Validate setup before proceeding
    if (!currentModelId) {
      showSetupToast(
        <Settings className="size-4.5 text-amber-600 dark:text-amber-400" />,
        t('settings.modelNotConfigured'),
        t('settings.setupNeeded'),
      );
      setSettingsOpen(true);
      return;
    }

    if (!canGenerate) {
      setError(t('upload.requirementRequired'));
      return;
    }

    setError(null);

    try {
      const userProfile = useUserProfileStore.getState();
      const requirements: UserRequirements = {
        requirement: form.requirement,
        language: form.language,
        userNickname: userProfile.nickname || undefined,
        userBio: userProfile.bio || undefined,
        webSearch: form.webSearch || undefined,
      };

      let pdfStorageKey: string | undefined;
      let pdfFileName: string | undefined;
      let pdfProviderId: string | undefined;
      let pdfProviderConfig: { apiKey?: string; baseUrl?: string } | undefined;

      if (form.pdfFile) {
        pdfStorageKey = await storePdfBlob(form.pdfFile);
        pdfFileName = form.pdfFile.name;

        const settings = useSettingsStore.getState();
        pdfProviderId = settings.pdfProviderId;
        const providerCfg = settings.pdfProvidersConfig?.[settings.pdfProviderId];
        if (providerCfg) {
          pdfProviderConfig = {
            apiKey: providerCfg.apiKey,
            baseUrl: providerCfg.baseUrl,
          };
        }
      }

      const sessionState = {
        sessionId: nanoid(),
        requirements,
        pdfText: '',
        pdfImages: [],
        imageStorageIds: [],
        pdfStorageKey,
        pdfFileName,
        pdfProviderId,
        pdfProviderConfig,
        sceneOutlines: null,
        currentStep: 'generating' as const,
      };
      sessionStorage.setItem('generationSession', JSON.stringify(sessionState));

      router.push('/generation-preview');
    } catch (err) {
      log.error('Error preparing generation:', err);
      setError(err instanceof Error ? err.message : t('upload.generateFailed'));
    }
  };

  const canGenerate = form.requirement.trim().length > 0 || !!form.pdfFile;

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 dark:bg-[#060b19] flex flex-col items-center p-4 pt-16 md:p-8 md:pt-16 overflow-x-hidden text-slate-700 dark:text-slate-200 selection:bg-cyan-500/30 selection:text-cyan-800 dark:selection:text-cyan-200 transition-colors duration-300">
      {/* ═══ Background Decor (Cyberpunk grid & glow) ═══ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

        {/* Glows */}
        <div
          className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-300/30 dark:bg-blue-600/20 rounded-[100%] blur-[100px] animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-300/20 dark:bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      {/* ═══ Top-right pill ═══ */}
      <div
        ref={toolbarRef}
        className="fixed top-4 right-4 z-50 flex items-center gap-1 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md px-2 py-1.5 rounded-full border border-slate-200 dark:border-white/10 shadow-lg ring-1 ring-black/5 dark:ring-white/5 transition-all"
      >
        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setLanguageOpen(!languageOpen);
              setThemeOpen(false);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            {locale === 'zh-CN' ? 'CN' : 'EN'}
          </button>
          {languageOpen && (
            <div className="absolute top-full mt-2 right-0 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-lg shadow-xl shadow-black/10 dark:shadow-black/50 overflow-hidden z-50 min-w-[120px]">
              <button
                onClick={() => {
                  setLocale('zh-CN');
                  setLanguageOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors',
                  locale === 'zh-CN' && 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-white/5 font-medium',
                )}
              >
                简体中文
              </button>
              <button
                onClick={() => {
                  setLocale('en-US');
                  setLanguageOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors',
                  locale === 'en-US' && 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-white/5 font-medium',
                )}
              >
                English
              </button>
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10" />

        {/* Settings Button */}
        <div className="relative">
          <button
            onClick={() => setSettingsOpen(true)}
            className={cn(
              'p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all group',
              needsSetup && 'animate-setup-glow',
            )}
          >
            <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
          </button>
          {needsSetup && (
            <>
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-setup-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </span>
              <span className="animate-setup-float absolute top-full mt-2 right-0 whitespace-nowrap text-[11px] font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50 px-2 py-0.5 rounded-full shadow-sm pointer-events-none">
                {t('settings.setupNeeded')}
              </span>
            </>
          )}
        </div>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={(open) => {
          setSettingsOpen(open);
          if (!open) setSettingsSection(undefined);
        }}
        initialSection={settingsSection}
      />

      {/* ═══ Hero section: title + input (centered) ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={cn(
          'relative z-20 w-full max-w-[720px] flex flex-col items-center',
          classrooms.length === 0 ? 'justify-center min-h-[calc(100dvh-8rem)]' : 'mt-[8vh]',
        )}
      >
        {/* ── Logo ── */}
        <div className="relative mb-6 group cursor-default">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <motion.img
            src="/logo-horizontal.jpeg"
            alt="MiyaSensei Logo"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.1,
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
            className="relative h-16 md:h-24 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(0,0,0,0.5)] ring-1 ring-black/5 dark:ring-white/10"
          />
        </div>

        {/* ── Slogan ── */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-lg md:text-xl font-light text-slate-500 dark:text-slate-400 mb-10 text-center tracking-wide"
        >
          <span className="text-cyan-600 dark:text-cyan-400 font-normal">Input topic.</span> Generate a complete
          classroom.
        </motion.h2>

        {/* ── Unified input area ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full group/input"
        >
          <div className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0f172a]/60 backdrop-blur-xl shadow-2xl shadow-slate-200/50 dark:shadow-black/40 transition-all duration-500 hover:shadow-cyan-500/10 dark:hover:shadow-cyan-900/10 hover:border-cyan-500/20 dark:hover:border-white/20 focus-within:border-cyan-500/30 focus-within:shadow-[0_0_40px_-10px_rgba(6,182,212,0.15)] overflow-hidden">
            {/* Top Bar: Profile & Agents */}
            <div className="relative px-2 pt-2 flex items-center justify-between">
              <GreetingBar />
              <div className="scale-90 origin-right opacity-80 hover:opacity-100 transition-opacity">
                <AgentBar />
              </div>
            </div>

            {/* Textarea */}
            <div className="relative px-2">
              <textarea
                ref={textareaRef}
                placeholder={t('upload.requirementPlaceholder')}
                className="w-full resize-none border-0 bg-transparent px-4 py-3 text-base leading-relaxed text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none min-h-[100px] max-h-[300px]"
                value={form.requirement}
                onChange={(e) => updateForm('requirement', e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
              />

              {/* Decorative corner accents */}
              <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-slate-200 dark:border-white/10 rounded-tl opacity-0 group-focus-within/input:opacity-100 transition-opacity" />
              <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-slate-200 dark:border-white/10 rounded-tr opacity-0 group-focus-within/input:opacity-100 transition-opacity" />
            </div>

            {/* Bottom Toolbar & Action */}
            <div className="px-3 pb-3 pt-2 flex items-end gap-2 bg-gradient-to-t from-slate-50/40 dark:from-[#0f172a]/40 to-transparent">
              <div className="flex-1 min-w-0">
                <GenerationToolbar
                  language={form.language}
                  onLanguageChange={(lang) => updateForm('language', lang)}
                  webSearch={form.webSearch}
                  onWebSearchChange={(v) => updateForm('webSearch', v)}
                  onSettingsOpen={(section) => {
                    setSettingsSection(section);
                    setSettingsOpen(true);
                  }}
                  pdfFile={form.pdfFile}
                  onPdfFileChange={(f) => updateForm('pdfFile', f)}
                  onPdfError={setError}
                />
              </div>

              {/* Voice */}
              <SpeechButton
                size="md"
                onTranscription={(text) => {
                  setForm((prev) => {
                    const next = prev.requirement + (prev.requirement ? ' ' : '') + text;
                    updateRequirementCache(next);
                    return { ...prev, requirement: next };
                  });
                }}
              />

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={cn(
                  'shrink-0 h-10 px-5 rounded-xl flex items-center justify-center gap-2 transition-all font-medium',
                  canGenerate
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20 hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-white/5',
                )}
              >
                <span>{t('toolbar.enterClassroom')}</span>
                <ArrowUp className="size-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 w-full p-4 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 rounded-xl flex items-center justify-center"
            >
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ═══ Recent classrooms (Grid) ═══ */}
      {classrooms.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative z-10 mt-16 w-full max-w-6xl flex flex-col items-center pb-20"
        >
          {/* Section Divider */}
          <div className="w-full max-w-sm flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent" />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Recent Sessions
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent" />
          </div>

          <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4">
            {classrooms.map((classroom, i) => (
              <motion.div
                key={classroom.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.05 + 0.5,
                  duration: 0.4,
                  ease: 'easeOut',
                }}
              >
                <ClassroomCard
                  classroom={classroom}
                  slide={thumbnails[classroom.id]}
                  formatDate={(ts) => new Date(ts).toLocaleDateString()}
                  onDelete={handleDelete}
                  confirmingDelete={pendingDeleteId === classroom.id}
                  onConfirmDelete={() => confirmDelete(classroom.id)}
                  onCancelDelete={() => setPendingDeleteId(null)}
                  onClick={() => router.push(`/classroom/${classroom.id}`)}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <div className="mt-auto py-6 text-center">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 font-mono tracking-widest uppercase opacity-60">
          Miyasensei v1.0 • AI-Native Learning Platform
        </p>
      </div>
    </div>
  );
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

function GreetingBar() {
  const { t } = useI18n();
  const avatar = useUserProfileStore((s) => s.avatar);
  const nickname = useUserProfileStore((s) => s.nickname);
  const bio = useUserProfileStore((s) => s.bio);
  const setAvatar = useUserProfileStore((s) => s.setAvatar);
  const setNickname = useUserProfileStore((s) => s.setNickname);
  const setBio = useUserProfileStore((s) => s.setBio);

  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayName = nickname || t('profile.defaultNickname');

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingName(false);
        setAvatarPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const startEditName = () => {
    setNameDraft(nickname);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const commitName = () => {
    setNickname(nameDraft.trim());
    setEditingName(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error(t('profile.fileTooLarge'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.invalidFileType'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        const scale = Math.max(128 / img.width, 128 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (128 - w) / 2, (128 - h) / 2, w, h);
        setAvatar(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div ref={containerRef} className="relative w-auto z-20">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarUpload}
      />

      {/* ── Collapsed pill ── */}
      {!open && (
        <div
          className="flex items-center gap-3 cursor-pointer transition-all duration-200 group rounded-full px-1.5 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.98]"
          onClick={() => setOpen(true)}
        >
          <div className="shrink-0 relative">
            <div className="size-8 rounded-full overflow-hidden ring-1 ring-slate-200 dark:ring-white/20 group-hover:ring-cyan-500/50 dark:group-hover:ring-cyan-400/50 transition-all duration-300">
              <img src={avatar} alt="" className="size-full object-cover" />
            </div>
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <span className="leading-none select-none flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">
                Hello,
              </span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                {displayName}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* ── Expanded panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 top-0 z-50 w-72"
          >
            <div className="rounded-2xl bg-white dark:bg-[#1e293b] ring-1 ring-slate-200 dark:ring-white/10 shadow-2xl px-4 py-4 space-y-4">
              {/* Header Row */}
              <div className="flex items-start justify-between">
                <div
                  className="relative cursor-pointer group/avatar"
                  onClick={() => setAvatarPickerOpen(!avatarPickerOpen)}
                >
                  <div className="size-14 rounded-full overflow-hidden ring-2 ring-slate-100 dark:ring-white/10 group-hover/avatar:ring-cyan-500 transition-all">
                    <img src={avatar} alt="" className="size-full object-cover" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 size-5 bg-white dark:bg-[#0f172a] rounded-full flex items-center justify-center border border-slate-200 dark:border-white/10">
                    <Pencil className="size-2.5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </div>

                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  <ChevronUp className="size-4" />
                </button>
              </div>

              {/* Name Input */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1 block">
                  Nickname
                </label>
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={nameInputRef}
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && commitName()}
                      onBlur={commitName}
                      maxLength={20}
                      className="flex-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-sm text-slate-700 dark:text-white focus:border-cyan-500/50 outline-none"
                    />
                    <button
                      onClick={commitName}
                      className="p-1 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/30"
                    >
                      <Check className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={startEditName}
                    className="group/edit flex items-center gap-2 cursor-pointer py-1"
                  >
                    <span className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
                      {displayName}
                    </span>
                    <Pencil className="size-3 text-slate-400 dark:text-slate-600 group-hover/edit:text-cyan-500 transition-colors" />
                  </div>
                )}
              </div>

              {/* Avatar Picker */}
              <AnimatePresence>
                {avatarPickerOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 pb-1 flex gap-2 flex-wrap">
                      {AVATAR_OPTIONS.map((url) => (
                        <button
                          key={url}
                          onClick={() => setAvatar(url)}
                          className={cn(
                            'size-8 rounded-full overflow-hidden transition-all hover:scale-110',
                            avatar === url ? 'ring-2 ring-cyan-500' : 'ring-1 ring-slate-200 dark:ring-white/10',
                          )}
                        >
                          <img src={url} alt="" className="size-full" />
                        </button>
                      ))}
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        className="size-8 rounded-full border border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all"
                      >
                        <ImagePlus className="size-3.5 text-cyan-600 dark:text-cyan-400" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bio */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1 block">
                  Learning Goal / Bio
                </label>
                <UITextarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('profile.bioPlaceholder')}
                  rows={2}
                  className="resize-none bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 focus:border-cyan-500/30 min-h-[60px]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClassroomCard({
  classroom,
  slide,
  formatDate,
  onDelete,
  confirmingDelete,
  onConfirmDelete,
  onCancelDelete,
  onClick,
}: {
  classroom: StageListItem;
  slide?: Slide;
  formatDate: (ts: string | number) => string;
  onDelete: (id: string, e: React.MouseEvent) => void;
  confirmingDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumbWidth, setThumbWidth] = useState(0);

  useEffect(() => {
    const el = thumbRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setThumbWidth(Math.round(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="group relative flex flex-col cursor-pointer"
      onClick={confirmingDelete ? undefined : onClick}
    >
      {/* Thumbnail */}
      <div
        ref={thumbRef}
        className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 shadow-lg group-hover:shadow-cyan-500/20 dark:group-hover:shadow-cyan-900/20 group-hover:border-cyan-500/30 dark:group-hover:border-white/20 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-100 dark:from-[#060b19] via-transparent to-transparent opacity-60 z-10" />

        {slide && thumbWidth > 0 ? (
          <div className="opacity-80 group-hover:opacity-100 transition-opacity duration-300 scale-100 group-hover:scale-105 transition-transform">
            <ThumbnailSlide
              slide={slide}
              size={thumbWidth}
              viewportSize={slide.viewportSize ?? 1000}
              viewportRatio={slide.viewportRatio ?? 0.5625}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="size-8 text-slate-300 dark:text-white/10" />
          </div>
        )}

        {/* Delete Overlay */}
        <AnimatePresence>
          {confirmingDelete ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-white/90 dark:bg-[#060b19]/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-red-500 dark:text-red-300 mb-3">
                {t('classroom.deleteConfirmTitle')}
              </p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={onCancelDelete}
                  className="flex-1 py-1.5 rounded bg-slate-100 dark:bg-white/10 text-xs text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirmDelete}
                  className="flex-1 py-1.5 rounded bg-red-500 dark:bg-red-600/80 text-xs text-white hover:bg-red-600 dark:hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 size-8 bg-white/60 dark:bg-black/40 hover:bg-red-500/90 text-slate-600 dark:text-white hover:text-white opacity-0 group-hover:opacity-100 transition-all z-20 backdrop-blur-sm rounded-lg"
                onClick={(e) => onDelete(classroom.id, e)}
              >
                <Trash2 className="size-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div className="mt-3 px-1">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors mb-1">
          {classroom.name}
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium uppercase tracking-wide">
          <span>{classroom.sceneCount} Slides</span>
          <span className="size-0.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span>{formatDate(classroom.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return <HomePage />;
}
