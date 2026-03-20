'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useStageStore } from '@/lib/store';
import { PENDING_SCENE_ID } from '@/lib/store/stage';
import { useCanvasStore } from '@/lib/store/canvas';
import { useSettingsStore } from '@/lib/store/settings';
import { useI18n } from '@/lib/hooks/use-i18n';
import { SceneSidebar } from './stage/scene-sidebar';
import { Header } from './header';
import { CanvasArea } from '@/components/canvas/canvas-area';
import { Roundtable } from '@/components/roundtable';
import { PlaybackEngine, computePlaybackView } from '@/lib/playback';
import type { EngineMode, TriggerEvent, Effect } from '@/lib/playback';
import { ActionEngine } from '@/lib/action/engine';
import { createAudioPlayer } from '@/lib/utils/audio-player';
import type { Action, DiscussionAction, SpeechAction } from '@/lib/types/action';
// Playback state persistence removed — refresh always starts from the beginning
import { ChatArea, type ChatAreaRef } from '@/components/chat/chat-area';
import { agentsToParticipants, useAgentRegistry } from '@/lib/orchestration/registry/store';
import type { AgentConfig } from '@/lib/orchestration/registry/types';
import {
  Menu,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AgentAvatar } from '@/components/agent/agent-avatar';

/**
 * Stage Component - Miyasensei Layout
 * 
 * Implements the 3-panel layout:
 * - Left: AI Teacher Panel (Avatar + Transcript)
 * - Right: Slides Panel (Canvas)
 * - Bottom: Integrated Chat & Quiz (part of Left Panel flow)
 */
export function Stage({
  onRetryOutline,
}: {
  onRetryOutline?: (outlineId: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const { mode, getCurrentScene, scenes, currentSceneId, setCurrentSceneId, generatingOutlines } =
    useStageStore();
  const failedOutlines = useStageStore.use.failedOutlines();

  const currentScene = getCurrentScene();

  // Layout state from settings store
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);
  // Chat collapsed state is now irrelevant as it's always visible in the new layout, 
  // but we keep the state to satisfy CanvasArea props if needed.
  const chatAreaCollapsed = useSettingsStore((s) => s.chatAreaCollapsed);
  const setChatAreaCollapsed = useSettingsStore((s) => s.setChatAreaCollapsed);

  // PlaybackEngine state
  const [engineMode, setEngineMode] = useState<EngineMode>('idle');
  const [playbackCompleted, setPlaybackCompleted] = useState(false);
  const [lectureSpeech, setLectureSpeech] = useState<string | null>(null);
  const [liveSpeech, setLiveSpeech] = useState<string | null>(null);
  const [speechProgress, setSpeechProgress] = useState<number | null>(null);
  const [discussionTrigger, setDiscussionTrigger] = useState<TriggerEvent | null>(null);

  // Speaking agent tracking
  const [speakingAgentId, setSpeakingAgentId] = useState<string | null>(null);

  // Thinking state
  const [thinkingState, setThinkingState] = useState<{
    stage: string;
    agentId?: string;
  } | null>(null);

  // Cue user state
  const [isCueUser, setIsCueUser] = useState(false);

  // End flash state
  const [showEndFlash, setShowEndFlash] = useState(false);
  const [endFlashSessionType, setEndFlashSessionType] = useState<'qa' | 'discussion'>('discussion');

  // Streaming state for stop button
  const [chatIsStreaming, setChatIsStreaming] = useState(false);
  const [chatSessionType, setChatSessionType] = useState<string | null>(null);

  // Topic pending state
  const [isTopicPending, setIsTopicPending] = useState(false);

  // Active bubble ID for playback highlight
  const [activeBubbleId, setActiveBubbleId] = useState<string | null>(null);

  // Whiteboard state
  const whiteboardOpen = useCanvasStore.use.whiteboardOpen();
  const setWhiteboardOpen = useCanvasStore.use.setWhiteboardOpen();

  // Selected agents from settings store (Zustand)
  const selectedAgentIds = useSettingsStore((s) => s.selectedAgentIds);

  // Generate participants from selected agents
  const participants = useMemo(
    () => agentsToParticipants(selectedAgentIds, t),
    [selectedAgentIds, t],
  );

  // Pick a student agent for discussion trigger (prioritize student > non-teacher > fallback)
  const pickStudentAgent = useCallback((): string => {
    const registry = useAgentRegistry.getState();
    const agents = selectedAgentIds
      .map((id) => registry.getAgent(id))
      .filter((a): a is AgentConfig => a != null);
    const students = agents.filter((a) => a.role === 'student');
    if (students.length > 0) {
      return students[Math.floor(Math.random() * students.length)].id;
    }
    const nonTeachers = agents.filter((a) => a.role !== 'teacher');
    if (nonTeachers.length > 0) {
      return nonTeachers[Math.floor(Math.random() * nonTeachers.length)].id;
    }
    return agents[0]?.id || 'default-1';
  }, [selectedAgentIds]);

  const engineRef = useRef<PlaybackEngine | null>(null);
  const audioPlayerRef = useRef(createAudioPlayer());
  const chatAreaRef = useRef<ChatAreaRef>(null);
  const lectureSessionIdRef = useRef<string | null>(null);
  const lectureActionCounterRef = useRef(0);
  const discussionAbortRef = useRef<AbortController | null>(null);
  // Guard to prevent double flash when manual stop triggers onDiscussionEnd
  const manualStopRef = useRef(false);
  // Monotonic counter incremented on each scene switch — used to discard stale SSE callbacks
  const sceneEpochRef = useRef(0);
  // When true, the next engine init will auto-start playback (for auto-play scene advance)
  const autoStartRef = useRef(false);

  /**
   * Soft-pause: interrupt current agent stream but keep the session active.
   * Used when clicking the bubble pause button or opening input during QA/discussion.
   * Does NOT end the topic — user can continue speaking in the same session.
   * Preserves liveSpeech (with "..." appended) and speakingAgentId so the
   * roundtable bubble stays on the interrupted agent's text.
   */
  const doSoftPause = useCallback(async () => {
    await chatAreaRef.current?.softPauseActiveSession();
    // Append "..." to live speech to show interruption in roundtable bubble.
    // Only annotate when there's actual text being interrupted — during pure
    // director-thinking (prev is null, no agent assigned), leave liveSpeech
    // as-is so no spurious teacher bubble appears.
    setLiveSpeech((prev) => (prev !== null ? prev + '...' : null));
    // Keep speakingAgentId — bubble identity is preserved
    setThinkingState(null);
    setChatIsStreaming(false);
    setIsTopicPending(true);
    // Don't clear chatSessionType, speakingAgentId, or liveSpeech
    // Don't show end flash
    // Don't call handleEndDiscussion — engine stays in current state
  }, []);

  /**
   * Resume a soft-paused topic: re-call /chat with existing session messages.
   * The director picks the next agent to continue.
   */
  const doResumeTopic = useCallback(async () => {
    // Clear old bubble immediately — no lingering on interrupted text
    setIsTopicPending(false);
    setLiveSpeech(null);
    setSpeakingAgentId(null);
    setThinkingState({ stage: 'director' });
    setChatIsStreaming(true);
    // Fire new chat round — SSE events will drive thinking → agent_start → speech
    await chatAreaRef.current?.resumeActiveSession();
  }, []);

  /** Reset all live/discussion state (shared by doSessionCleanup & onDiscussionEnd) */
  const resetLiveState = useCallback(() => {
    setLiveSpeech(null);
    setSpeakingAgentId(null);
    setSpeechProgress(null);
    setThinkingState(null);
    setIsCueUser(false);
    setIsTopicPending(false);
    setChatIsStreaming(false);
    setChatSessionType(null);
  }, []);

  /** Full scene reset (scene switch) — resetLiveState + lecture/visual state */
  const resetSceneState = useCallback(() => {
    resetLiveState();
    setPlaybackCompleted(false);
    setLectureSpeech(null);
    setSpeechProgress(null);
    setShowEndFlash(false);
    setActiveBubbleId(null);
    setDiscussionTrigger(null);
  }, [resetLiveState]);

  /**
   * Unified session cleanup — called by both roundtable stop button and chat area end button.
   * Handles: engine transition, flash, roundtable state clearing.
   */
  const doSessionCleanup = useCallback(() => {
    const activeType = chatSessionType;

    // Engine cleanup — guard to avoid double flash from onDiscussionEnd
    manualStopRef.current = true;
    engineRef.current?.handleEndDiscussion();
    manualStopRef.current = false;

    // Show end flash with correct session type
    if (activeType === 'qa' || activeType === 'discussion') {
      setEndFlashSessionType(activeType);
      setShowEndFlash(true);
      setTimeout(() => setShowEndFlash(false), 1800);
    }

    resetLiveState();
  }, [chatSessionType, resetLiveState]);

  // Shared stop-discussion handler (used by both Roundtable and Canvas toolbar)
  const handleStopDiscussion = useCallback(async () => {
    await chatAreaRef.current?.endActiveSession();
    doSessionCleanup();
  }, [doSessionCleanup]);

  // Initialize playback engine when scene changes
  useEffect(() => {
    // Bump epoch so any stale SSE callbacks from the previous scene are discarded
    sceneEpochRef.current++;

    // End any active QA/discussion session — this synchronously aborts the SSE
    // stream inside use-chat-sessions (abortControllerRef.abort()), preventing
    // stale onLiveSpeech callbacks from leaking into the new scene.
    chatAreaRef.current?.endActiveSession();

    // Also abort the engine-level discussion controller
    if (discussionAbortRef.current) {
      discussionAbortRef.current.abort();
      discussionAbortRef.current = null;
    }

    // Reset all roundtable/live state so scenes are fully isolated
    resetSceneState();

    if (!currentScene || !currentScene.actions || currentScene.actions.length === 0) {
      engineRef.current = null;
      setEngineMode('idle');

      return;
    }

    // Stop previous engine
    if (engineRef.current) {
      engineRef.current.stop();
    }

    // Create ActionEngine for playback (with audioPlayer for TTS)
    const actionEngine = new ActionEngine(useStageStore, audioPlayerRef.current);

    // Create new PlaybackEngine
    const engine = new PlaybackEngine([currentScene], actionEngine, audioPlayerRef.current, {
      onModeChange: (mode) => {
        setEngineMode(mode);
      },
      onSceneChange: (_sceneId) => {
        // Scene change handled by engine
      },
      onSpeechStart: (text) => {
        setLectureSpeech(text);
        // Add to lecture session with incrementing index for dedup
        // Chat area pacing is handled by the StreamBuffer (onTextReveal)
        if (lectureSessionIdRef.current) {
          const idx = lectureActionCounterRef.current++;
          const speechId = `speech-${Date.now()}`;
          chatAreaRef.current?.addLectureMessage(
            lectureSessionIdRef.current,
            { id: speechId, type: 'speech', text } as Action,
            idx,
          );
          // Track active bubble for highlight (Issue 8)
          const msgId = chatAreaRef.current?.getLectureMessageId(lectureSessionIdRef.current!);
          if (msgId) setActiveBubbleId(msgId);
        }
      },
      onSpeechEnd: () => {
        // Don't clear lectureSpeech — let it persist until the next
        // onSpeechStart replaces it or the scene transitions.
        // Clearing here causes fallback to idleText (first sentence).
        setActiveBubbleId(null);
      },
      onEffectFire: (effect: Effect) => {
        // Add to lecture session with incrementing index
        if (
          lectureSessionIdRef.current &&
          (effect.kind === 'spotlight' || effect.kind === 'laser')
        ) {
          const idx = lectureActionCounterRef.current++;
          chatAreaRef.current?.addLectureMessage(
            lectureSessionIdRef.current,
            {
              id: `${effect.kind}-${Date.now()}`,
              type: effect.kind,
              elementId: effect.targetId,
            } as Action,
            idx,
          );
        }
      },
      onProactiveShow: (trigger) => {
        if (!trigger.agentId) {
          // Mutate in-place so engine.currentTrigger also gets the agentId
          // (confirmDiscussion reads agentId from the same object reference)
          trigger.agentId = pickStudentAgent();
        }
        setDiscussionTrigger(trigger);
      },
      onProactiveHide: () => {
        setDiscussionTrigger(null);
      },
      onDiscussionConfirmed: (topic, prompt, agentId) => {
        // Start SSE discussion via ChatArea
        handleDiscussionSSE(topic, prompt, agentId);
      },
      onDiscussionEnd: () => {
        // Abort any active SSE
        if (discussionAbortRef.current) {
          discussionAbortRef.current.abort();
          discussionAbortRef.current = null;
        }
        setDiscussionTrigger(null);
        // Clear roundtable state (idempotent — may already be cleared by doSessionCleanup)
        resetLiveState();
        // Only show flash for engine-initiated ends (not manual stop — that's handled by doSessionCleanup)
        if (!manualStopRef.current) {
          setEndFlashSessionType('discussion');
          setShowEndFlash(true);
          setTimeout(() => setShowEndFlash(false), 1800);
        }
        // If all actions are exhausted (discussion was the last action), mark
        // playback as completed so the bubble shows reset instead of play.
        if (engineRef.current?.isExhausted()) {
          setPlaybackCompleted(true);
        }
      },
      onUserInterrupt: (text) => {
        // User interrupted → start a discussion via chat
        chatAreaRef.current?.sendMessage(text);
      },
      isAgentSelected: (agentId) => {
        const ids = useSettingsStore.getState().selectedAgentIds;
        return ids.includes(agentId);
      },
      getPlaybackSpeed: () => useSettingsStore.getState().playbackSpeed || 1,
      onComplete: () => {
        // lectureSpeech intentionally NOT cleared — last sentence stays visible
        // until scene transition (auto-play) or user restarts. Scene change
        // effect handles the reset.
        setPlaybackCompleted(true);

        // End lecture session on playback complete
        if (lectureSessionIdRef.current) {
          chatAreaRef.current?.endSession(lectureSessionIdRef.current);
          lectureSessionIdRef.current = null;
        }
        // Auto-play: advance to next scene after a short pause
        const { autoPlayLecture } = useSettingsStore.getState();
        if (autoPlayLecture) {
          setTimeout(() => {
            const stageState = useStageStore.getState();
            if (!useSettingsStore.getState().autoPlayLecture) return;
            const allScenes = stageState.scenes;
            const curId = stageState.currentSceneId;
            const idx = allScenes.findIndex((s) => s.id === curId);
            if (idx >= 0 && idx < allScenes.length - 1) {
              const currentScene = allScenes[idx];
              if (
                currentScene.type === 'quiz' ||
                currentScene.type === 'interactive' ||
                currentScene.type === 'pbl'
              ) {
                return;
              }
              autoStartRef.current = true;
              stageState.setCurrentSceneId(allScenes[idx + 1].id);
            } else if (idx === allScenes.length - 1 && stageState.generatingOutlines.length > 0) {
              // Last scene exhausted but next is still generating — go to pending page
              const currentScene = allScenes[idx];
              if (
                currentScene.type === 'quiz' ||
                currentScene.type === 'interactive' ||
                currentScene.type === 'pbl'
              ) {
                return;
              }
              autoStartRef.current = true;
              stageState.setCurrentSceneId(PENDING_SCENE_ID);
            }
          }, 1500);
        }
      },
    });

    engineRef.current = engine;

    // Auto-start if triggered by auto-play scene advance
    if (autoStartRef.current) {
      autoStartRef.current = false;
      (async () => {
        if (currentScene && chatAreaRef.current) {
          const sessionId = await chatAreaRef.current.startLecture(currentScene.id);
          lectureSessionIdRef.current = sessionId;
          lectureActionCounterRef.current = 0;
        }
        engine.start();
      })();
    } else {
      // Load saved playback state and restore position (but never auto-play).
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-run when scene changes, functions are stable refs
  }, [currentScene]);

  // Cleanup on unmount
  useEffect(() => {
    const audioPlayer = audioPlayerRef.current;
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
      audioPlayer.destroy();
      if (discussionAbortRef.current) {
        discussionAbortRef.current.abort();
      }
    };
  }, []);

  // Sync mute state from settings store to audioPlayer
  const ttsMuted = useSettingsStore((s) => s.ttsMuted);
  useEffect(() => {
    audioPlayerRef.current.setMuted(ttsMuted);
  }, [ttsMuted]);

  // Sync volume from settings store to audioPlayer
  const ttsVolume = useSettingsStore((s) => s.ttsVolume);
  useEffect(() => {
    if (!ttsMuted) {
      audioPlayerRef.current.setVolume(ttsVolume);
    }
  }, [ttsVolume, ttsMuted]);

  // Sync playback speed to audio player (for live-updating current audio)
  const playbackSpeed = useSettingsStore((s) => s.playbackSpeed);
  useEffect(() => {
    audioPlayerRef.current.setPlaybackRate(playbackSpeed);
  }, [playbackSpeed]);

  /**
   * Handle discussion SSE — POST /api/chat and push events to engine
   */
  const handleDiscussionSSE = useCallback(
    async (topic: string, prompt?: string, agentId?: string) => {
      // Start discussion display in ChatArea (lecture speech is preserved independently)
      chatAreaRef.current?.startDiscussion({
        topic,
        prompt,
        agentId: agentId || 'default-1',
      });
      // Auto-switch to chat tab when discussion starts
      chatAreaRef.current?.switchToTab('chat');
      // Immediately mark streaming for synchronized stop button
      setChatIsStreaming(true);
      setChatSessionType('discussion');
      // Optimistic thinking: show thinking dots immediately (same as onMessageSend)
      setThinkingState({ stage: 'director' });
    },
    [],
  );

  // First speech text for idle display (extracted here for playbackView)
  const firstSpeechText = useMemo(
    () => currentScene?.actions?.find((a): a is SpeechAction => a.type === 'speech')?.text ?? null,
    [currentScene],
  );

  // Whether the speaking agent is a student (for bubble role derivation)
  const speakingStudentFlag = useMemo(() => {
    if (!speakingAgentId) return false;
    const agent = useAgentRegistry.getState().getAgent(speakingAgentId);
    return agent?.role !== 'teacher';
  }, [speakingAgentId]);

  // Centralised derived playback view
  const playbackView = useMemo(
    () =>
      computePlaybackView({
        engineMode,
        lectureSpeech,
        liveSpeech,
        speakingAgentId,
        thinkingState,
        isCueUser,
        isTopicPending,
        chatIsStreaming,
        discussionTrigger,
        playbackCompleted,
        idleText: firstSpeechText,
        speakingStudent: speakingStudentFlag,
        sessionType: chatSessionType,
      }),
    [
      engineMode,
      lectureSpeech,
      liveSpeech,
      speakingAgentId,
      thinkingState,
      isCueUser,
      isTopicPending,
      chatIsStreaming,
      discussionTrigger,
      playbackCompleted,
      firstSpeechText,
      speakingStudentFlag,
      chatSessionType,
    ],
  );

  const isTopicActive = playbackView.isTopicActive;

  /**
   * Gated scene switch — if a topic is active, show AlertDialog before switching.
   * Returns true if the switch was immediate, false if gated (dialog shown).
   */
  const gatedSceneSwitch = useCallback(
    (targetSceneId: string): boolean => {
      if (targetSceneId === currentSceneId) return false;
      if (isTopicActive) {
        setPendingSceneId(targetSceneId);
        return false;
      }
      setCurrentSceneId(targetSceneId);
      return true;
    },
    [currentSceneId, isTopicActive, setCurrentSceneId],
  );

  /** User confirmed scene switch via AlertDialog */
  const confirmSceneSwitch = useCallback(() => {
    if (!pendingSceneId) return;
    chatAreaRef.current?.endActiveSession();
    doSessionCleanup();
    setCurrentSceneId(pendingSceneId);
    setPendingSceneId(null);
  }, [pendingSceneId, setCurrentSceneId, doSessionCleanup]);

  /** User cancelled scene switch via AlertDialog */
  const cancelSceneSwitch = useCallback(() => {
    setPendingSceneId(null);
  }, []);

  // play/pause toggle
  const handlePlayPause = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    const mode = engine.getMode();
    if (mode === 'playing' || mode === 'live') {
      engine.pause();
      // Pause lecture buffer so text stops immediately
      if (lectureSessionIdRef.current) {
        chatAreaRef.current?.pauseBuffer(lectureSessionIdRef.current);
      }
    } else if (mode === 'paused') {
      engine.resume();
      // Resume lecture buffer
      if (lectureSessionIdRef.current) {
        chatAreaRef.current?.resumeBuffer(lectureSessionIdRef.current);
      }
    } else {
      const wasCompleted = playbackCompleted;
      setPlaybackCompleted(false);
      // Starting playback - create/reuse lecture session
      if (currentScene && chatAreaRef.current) {
        const sessionId = await chatAreaRef.current.startLecture(currentScene.id);
        lectureSessionIdRef.current = sessionId;
      }
      if (wasCompleted) {
        // Restart from beginning (user clicked restart after completion)
        lectureActionCounterRef.current = 0;
        engine.start();
      } else {
        // Continue from current position (e.g. after discussion end)
        engine.continuePlayback();
      }
    }
  };

  // previous scene (gated)
  const handlePreviousScene = () => {
    if (isPendingScene) {
      // From pending page → go to last real scene
      if (scenes.length > 0) {
        gatedSceneSwitch(scenes[scenes.length - 1].id);
      }
      return;
    }
    const currentIndex = scenes.findIndex((s) => s.id === currentSceneId);
    if (currentIndex > 0) {
      gatedSceneSwitch(scenes[currentIndex - 1].id);
    }
  };

  // next scene (gated)
  const handleNextScene = () => {
    if (isPendingScene) return; // Already on pending, nowhere to go
    const currentIndex = scenes.findIndex((s) => s.id === currentSceneId);
    if (currentIndex < scenes.length - 1) {
      gatedSceneSwitch(scenes[currentIndex + 1].id);
    } else if (hasNextPending) {
      // On last real scene → advance to pending page
      setCurrentSceneId(PENDING_SCENE_ID);
    }
  };

  // get scene information
  const isPendingScene = currentSceneId === PENDING_SCENE_ID;
  const hasNextPending = generatingOutlines.length > 0;
  const currentSceneIndex = isPendingScene
    ? scenes.length
    : scenes.findIndex((s) => s.id === currentSceneId);
  const totalScenesCount = scenes.length + (hasNextPending ? 1 : 0);

  // get action information
  const totalActions = currentScene?.actions?.length || 0;

  // whiteboard toggle
  const handleWhiteboardToggle = () => {
    setWhiteboardOpen(!whiteboardOpen);
  };

  // Map engine mode to the CanvasArea's expected engine state
  const canvasEngineState = (() => {
    switch (engineMode) {
      case 'playing':
      case 'live':
        return 'playing';
      case 'paused':
        return 'paused';
      default:
        return 'idle';
    }
  })();

  // Build discussion request for Roundtable ProactiveCard from trigger
  const discussionRequest: DiscussionAction | null = discussionTrigger
    ? {
        type: 'discussion',
        id: discussionTrigger.id,
        topic: discussionTrigger.question,
        prompt: discussionTrigger.prompt,
        agentId: discussionTrigger.agentId || 'default-1',
      }
    : null;


  return (
    <div className="flex-1 w-full h-full bg-[#060b19] overflow-hidden">
      {/* Desktop Layout - Grid */}
      <div className="hidden md:flex w-full h-full">
        {/* Sidebar (Optional/Collapsible Scene List) */}
        {!sidebarCollapsed && (
          <div className="w-[280px] shrink-0 border-r border-white/10 bg-[#060b19]/95 backdrop-blur z-20">
            <SceneSidebar
              collapsed={false}
              onCollapseChange={setSidebarCollapsed}
              onSceneSelect={gatedSceneSwitch}
              onRetryOutline={onRetryOutline}
            />
          </div>
        )}

        {/* Left Panel - AI Teacher & Chat */}
        <div className="flex flex-col border-r border-white/10 bg-[#060b19]/90 backdrop-blur min-w-[350px] max-w-[450px] w-1/3 relative z-10">
          {/* Teacher Header */}
          <div className="shrink-0 h-16 flex items-center justify-between px-4 border-b border-white/5 bg-[#060b19]/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <AgentAvatar className="size-10 ring-2 ring-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
                <div className="absolute -bottom-1 -right-1 size-3 rounded-full bg-green-500 ring-2 ring-[#060b19] animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-wide">Miyasensei</span>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">AI Tutor Active</span>
              </div>
            </div>
            
            <button 
               onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
               className="p-2 rounded-lg hover:bg-white/5 text-white/60 transition-colors"
               title={sidebarCollapsed ? "Show Syllabus" : "Hide Syllabus"}
            >
               <Menu className="size-5" />
            </button>
          </div>

          {/* Chat / Interaction Area */}
          <div className="flex-1 min-h-0 relative">
            <ChatArea
              ref={chatAreaRef}
              className="w-full h-full border-0 bg-transparent"
              width={undefined} // Force fluid width
              collapsed={false}
              activeBubbleId={activeBubbleId}
              onActiveBubble={(id) => setActiveBubbleId(id)}
              currentSceneId={currentSceneId}
              onLiveSpeech={(text, agentId) => {
                const epoch = sceneEpochRef.current;
                queueMicrotask(() => {
                  if (sceneEpochRef.current !== epoch) return;
                  setLiveSpeech(text);
                  if (agentId !== undefined) setSpeakingAgentId(agentId);
                  
                  if (text !== null || agentId) {
                    setChatIsStreaming(true);
                    setChatSessionType(chatAreaRef.current?.getActiveSessionType?.() ?? null);
                    setIsTopicPending(false);
                  } else if (text === null && agentId === null) {
                    setChatIsStreaming(false);
                  }
                });
              }}
              onSpeechProgress={(ratio) => {
                const epoch = sceneEpochRef.current;
                queueMicrotask(() => {
                  if (sceneEpochRef.current !== epoch) return;
                  setSpeechProgress(ratio);
                });
              }}
              onThinking={(state) => {
                const epoch = sceneEpochRef.current;
                queueMicrotask(() => {
                  if (sceneEpochRef.current !== epoch) return;
                  setThinkingState(state);
                });
              }}
              onCueUser={(_fromAgentId, _prompt) => setIsCueUser(true)}
              onStopSession={doSessionCleanup}
            />
          </div>
        </div>

        {/* Right Panel - Slides */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/40 relative">
          {/* Header Bar for Slides */}
          <div className="shrink-0 h-14 flex items-center justify-between px-6 border-b border-white/5 bg-[#060b19]">
             <div className="flex items-center gap-2 overflow-hidden">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  LESSON {currentSceneIndex + 1}
                </span>
                <h1 className="text-sm font-medium text-white/90 truncate max-w-[300px]">
                  {currentScene?.title || t('stage.generatingNextPage')}
                </h1>
             </div>
             
             <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5">
                <button 
                  onClick={handlePreviousScene}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/70 disabled:opacity-30 transition-colors"
                  disabled={currentSceneIndex <= 0}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-xs font-mono text-white/50 px-2 min-w-[60px] text-center">
                  {currentSceneIndex + 1} / {totalScenesCount}
                </span>
                <button 
                  onClick={handleNextScene}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/70 disabled:opacity-30 transition-colors"
                  disabled={currentSceneIndex >= totalScenesCount - 1 && !hasNextPending}
                >
                  <ChevronRight className="size-4" />
                </button>
             </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden p-4">
             <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <CanvasArea
                  currentScene={currentScene}
                  currentSceneIndex={currentSceneIndex}
                  scenesCount={totalScenesCount}
                  mode={mode}
                  engineState={canvasEngineState}
                  isLiveSession={chatIsStreaming || isTopicPending || engineMode === 'live' || !!chatSessionType}
                  whiteboardOpen={whiteboardOpen}
                  // Hide standard toolbar as we have the header
                  hideToolbar={false} 
                  sidebarCollapsed={true} // Force collapsed in internal logic
                  chatCollapsed={true} // Force collapsed in internal logic
                  onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                  onToggleChat={() => {}}
                  onPrevSlide={handlePreviousScene}
                  onNextSlide={handleNextScene}
                  onPlayPause={handlePlayPause}
                  onWhiteboardClose={handleWhiteboardToggle}
                  showStopDiscussion={engineMode === 'live' || (chatIsStreaming && (chatSessionType === 'qa' || chatSessionType === 'discussion'))}
                  onStopDiscussion={handleStopDiscussion}
                  isPendingScene={isPendingScene}
                  isGenerationFailed={isPendingScene && failedOutlines.some((f) => f.id === generatingOutlines[0]?.id)}
                  onRetryGeneration={onRetryOutline && generatingOutlines[0] ? () => onRetryOutline(generatingOutlines[0].id) : undefined}
                />
             </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout - Tabs */}
      <div className="md:hidden flex flex-col w-full h-full">
        <Tabs defaultValue="teacher" className="flex-1 flex flex-col min-h-0 bg-[#060b19]">
           <div className="shrink-0 px-4 py-2 border-b border-white/10 bg-[#060b19] flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <AgentAvatar className="size-8" />
                 <span className="font-bold text-white text-sm">Miyasensei</span>
              </div>
              <TabsList className="bg-white/5 border border-white/5">
                 <TabsTrigger value="teacher" className="text-xs">Teacher</TabsTrigger>
                 <TabsTrigger value="slides" className="text-xs">Slides</TabsTrigger>
              </TabsList>
           </div>
           
           <TabsContent value="teacher" className="flex-1 min-h-0 relative m-0">
               {/* Mobile Chat Area */}
               <ChatArea
                  ref={chatAreaRef}
                  className="w-full h-full border-0 bg-transparent"
                  width={undefined}
                  collapsed={false}
                  activeBubbleId={activeBubbleId}
                  onActiveBubble={(id) => setActiveBubbleId(id)}
                  currentSceneId={currentSceneId}
                  onLiveSpeech={(text, agentId) => {
                    setLiveSpeech(text);
                    if (agentId !== undefined) setSpeakingAgentId(agentId);
                    if (text !== null || agentId) {
                       setChatIsStreaming(true);
                       setChatSessionType(chatAreaRef.current?.getActiveSessionType?.() ?? null);
                       setIsTopicPending(false);
                    } else if (text === null && agentId === null) {
                       setChatIsStreaming(false);
                    }
                  }}
                  onSpeechProgress={setSpeechProgress}
                  onThinking={setThinkingState}
                  onCueUser={() => setIsCueUser(true)}
                  onStopSession={doSessionCleanup}
                />
           </TabsContent>

           <TabsContent value="slides" className="flex-1 min-h-0 relative m-0 flex flex-col">
              <div className="flex-1 relative">
                 <CanvasArea
                    currentScene={currentScene}
                    currentSceneIndex={currentSceneIndex}
                    scenesCount={totalScenesCount}
                    mode={mode}
                    engineState={canvasEngineState}
                    isLiveSession={chatIsStreaming}
                    whiteboardOpen={whiteboardOpen}
                    hideToolbar={false}
                    sidebarCollapsed={true}
                    chatCollapsed={true}
                    onToggleSidebar={() => {}}
                    onToggleChat={() => {}}
                    onPrevSlide={handlePreviousScene}
                    onNextSlide={handleNextScene}
                    onPlayPause={handlePlayPause}
                    onWhiteboardClose={handleWhiteboardToggle}
                    showStopDiscussion={false}
                    onStopDiscussion={handleStopDiscussion}
                    isPendingScene={isPendingScene}
                    isGenerationFailed={isPendingScene && failedOutlines.some((f) => f.id === generatingOutlines[0]?.id)}
                    onRetryGeneration={onRetryOutline && generatingOutlines[0] ? () => onRetryOutline(generatingOutlines[0].id) : undefined}
                 />
              </div>
              {/* Mobile Slide Controls Bar */}
              <div className="shrink-0 h-12 flex items-center justify-between px-4 border-t border-white/10 bg-[#060b19]">
                  <button onClick={handlePreviousScene} disabled={currentSceneIndex <= 0} className="p-2 text-white/70 disabled:opacity-30">
                     <ChevronLeft className="size-5" />
                  </button>
                  <span className="text-xs font-mono text-white/50">{currentSceneIndex + 1} / {totalScenesCount}</span>
                  <button onClick={handleNextScene} disabled={currentSceneIndex >= totalScenesCount - 1} className="p-2 text-white/70 disabled:opacity-30">
                     <ChevronRight className="size-5" />
                  </button>
              </div>
           </TabsContent>
        </Tabs>
      </div>

      {/* Scene switch confirmation dialog */}
      <AlertDialog
        open={!!pendingSceneId}
        onOpenChange={(open) => {
          if (!open) cancelSceneSwitch();
        }}
      >
        <AlertDialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden border-0 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5)]">
          <VisuallyHidden.Root>
            <AlertDialogTitle>{t('stage.confirmSwitchTitle')}</AlertDialogTitle>
          </VisuallyHidden.Root>
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />

          <div className="px-6 pt-5 pb-2 flex flex-col items-center text-center">
            {/* Icon */}
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4 ring-1 ring-amber-200/50 dark:ring-amber-700/30">
              <AlertTriangle className="w-6 h-6 text-amber-500 dark:text-amber-400" />
            </div>
            {/* Title */}
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1.5">
              {t('stage.confirmSwitchTitle')}
            </h3>
            {/* Description */}
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('stage.confirmSwitchMessage')}
            </p>
          </div>

          <AlertDialogFooter className="px-6 pb-5 pt-3 flex-row gap-3">
            <AlertDialogCancel onClick={cancelSceneSwitch} className="flex-1 rounded-xl">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSceneSwitch}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-md shadow-amber-200/50 dark:shadow-amber-900/30"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
