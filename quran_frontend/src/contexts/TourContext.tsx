import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { driver, type Driver, type AllowedButtons } from 'driver.js';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';
import {
  TOUR_STEPS,
  createDriverStep,
  getDriverConfig,
  hasTourBeenAutoShown,
  markTourCompleted,
  markTourAutoShown,
  setTourClassId,
  clearTourClassId,
} from '../lib/tour';

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  startTour: () => void;
  pendingStep: number | null;
  clearPending: () => void;
}

const TourContext = createContext<TourContextType>({
  isActive: false,
  currentStep: -1,
  startTour: () => {},
  pendingStep: null,
  clearPending: () => {},
});

// Context and its hook intentionally live together as one public module.
// eslint-disable-next-line react-refresh/only-export-components
export function useTour() {
  return useContext(TourContext);
}

// Map screen names to routes
function screenToRoute(screen: string, classId?: string): string {
  switch (screen) {
    case 'dashboard':
    case 'dashboard-final':
      return '/';
    case 'sessions':
      return '/sessions?new=1';
    case 'classroom':
      return classId ? `/sessions/${classId}` : '/';
    case 'reader':
      return '/reader';
    case 'settings':
      return '/settings';
    default:
      return '/';
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useTheme();
  const { user } = useAuth();

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [pendingStep, setPendingStep] = useState<number | null>(null);
  const [tourClassId, setTourClassIdState] = useState<string | null>(null);
  const driverRef = useRef<Driver | null>(null);
  const interactiveListenerRef = useRef<(() => void) | null>(null);
  const advanceToStepRef = useRef<(nextStep: number) => void>(() => {});

  // Auto-start tour on first visit (only once per signed-in user)
  const autoStarted = useRef(false);

  // Cleanup interactive listeners
  const cleanupInteractiveListener = useCallback(() => {
    if (interactiveListenerRef.current) {
      interactiveListenerRef.current();
      interactiveListenerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(async () => {
    cleanupInteractiveListener();
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
    setIsActive(false);
    setCurrentStep(-1);
    setPendingStep(null);
    markTourCompleted(user?.id);
    clearTourClassId(user?.id);
    clearTourClassId();
  }, [cleanupInteractiveListener, user?.id]);

  /** Wait for a DOM element without adding a fixed delay between tour steps. */
  const waitForElement = useCallback((
    selector: string,
    callback: () => void,
    maxWait = 1_500,
  ) => {
    if (document.querySelector(selector)) {
      callback();
      return;
    }

    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      observer.disconnect();
      window.clearTimeout(timeout);
      callback();
    };
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) finish();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => {
      console.warn(`Tutorial target did not appear: ${selector}`);
      finish();
    }, maxWait);
  }, []);

  /** Bind the current interactive target and advance only after its result is visible. */
  const setupInteractiveListener = useCallback((
    stepIndex: number,
    stepDef: typeof TOUR_STEPS[0],
    d: Driver,
  ) => {
    const target = stepDef.interactiveTarget;
    if (!target) return;

    let disposed = false;
    let consumed = false;
    let boundElement: Element | null = null;
    let eventType = 'click';
    let listenerRegistered = false;
    const timers = new Set<number>();

    const schedule = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (!disposed) callback();
      }, delay);
      timers.add(timer);
    };

    const dispose = () => {
      if (disposed) return;
      disposed = true;
      timers.forEach(timer => window.clearTimeout(timer));
      timers.clear();
      if (listenerRegistered) {
        document.removeEventListener(eventType, handler, true);
        listenerRegistered = false;
      }
    };

    const advance = () => {
      if (disposed) return;
      dispose();
      d.destroy();
      advanceToStepRef.current(stepIndex + 1);
    };

    const interactionResultIsReady = () => {
      const elementReady =
        !stepDef.resultElement ||
        Boolean(document.querySelector(stepDef.resultElement));
      const pathReady =
        (!stepDef.waitForPath ||
          window.location.pathname === stepDef.waitForPath) &&
        (!stepDef.waitForPathPrefix ||
          window.location.pathname.startsWith(stepDef.waitForPathPrefix));
      return elementReady && pathReady;
    };

    const handler: EventListener = (event) => {
      if (disposed || consumed) return;
      const eventTarget = event.target instanceof Element ? event.target : null;
      if (!eventTarget?.closest(target)) return;
      consumed = true;

      // Route-gated actions may open a confirmation dialog (Delete) or show a
      // network-backed working state (Start Session). Remove Driver's overlay
      // immediately so the follow-up UI remains clickable while this listener
      // continues watching for the promised route.
      if (stepDef.waitForPath || stepDef.waitForPathPrefix) {
        d.destroy();
      }

      if (
        !stepDef.resultElement &&
        !stepDef.waitForPath &&
        !stepDef.waitForPathPrefix
      ) {
        schedule(advance, 250);
        return;
      }

      const deadline =
        Date.now() +
        (stepDef.waitForPathPrefix
          ? 15_000
          : stepDef.waitForPath
            ? 2_500
            : 5_000);
      const waitForResult = () => {
        if (interactionResultIsReady()) {
          schedule(advance, 250);
        } else if (Date.now() < deadline) {
          schedule(waitForResult, 100);
        } else {
          const actionStillRunning =
            stepDef.waitForPathPrefix &&
            boundElement instanceof HTMLButtonElement &&
            boundElement.disabled;
          if (actionStillRunning) {
            // A network-backed action may outlive the normal gate. Keep
            // observing its route while the button still says it is working.
            schedule(waitForResult, 100);
            return;
          }
          // The action did not produce its promised result (for example,
          // cancelling Delete). Keep this same step active and let the user retry.
          consumed = false;
        }
      };
      schedule(waitForResult, 0);
    };

    const checkAndBind = () => {
      const element = document.querySelector(target);
      if (!element) {
        schedule(checkAndBind, 100);
        return;
      }

      boundElement = element;
      eventType =
        element.tagName === 'SELECT'
          ? 'change'
          : element.tagName === 'TEXTAREA'
            ? 'input'
            : 'click';
      // Delegate from document so React may replace a popup/target between
      // tutorial steps without orphaning the listener on a detached element.
      document.addEventListener(eventType, handler, true);
      listenerRegistered = true;
    };

    // Register cancellation before the first lookup so route/step changes also
    // cancel target retries and delayed advances.
    interactiveListenerRef.current = dispose;
    checkAndBind();
  }, []);

  const showStep = useCallback((stepIndex: number) => {
    if (stepIndex < 0 || stepIndex >= TOUR_STEPS.length) return;

    cleanupInteractiveListener();

    const stepDef = TOUR_STEPS[stepIndex];
    const driverStep = createDriverStep(stepDef);

    const config = getDriverConfig(darkMode);

    // Destroy previous driver instance
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    const isLastStep = stepIndex === TOUR_STEPS.length - 1;
    const isInteractive = stepDef.type === 'interactive';
    const showButtons: AllowedButtons[] = isInteractive
      ? (stepIndex > 0 ? ['previous'] : [])
      : (stepIndex > 0 ? ['previous', 'next'] : ['next']);

    const d = driver({
      ...config,
      steps: [driverStep],
      showButtons,
      nextBtnText: isLastStep ? 'Finish' : 'Next →',
      doneBtnText: isLastStep ? 'Finish' : 'Next →',
      prevBtnText: '← Previous',
      // For interactive steps, clicking the highlighted area should pass through
      stagePadding: isInteractive ? 8 : 16,
      allowKeyboardControl: !isInteractive,
      // Render the extra control before Driver.js measures and positions the
      // popover. Adding it afterward makes the popover grow back over the
      // highlighted input, which is especially confusing in the portions modal.
      onPopoverRender: (popover) => {
        if (popover.wrapper.querySelector('.tour-progress')) return;

        const progress = document.createElement('div');
        progress.className = 'tour-progress';
        progress.innerHTML = `<span>QURANTRACK GUIDE</span><strong>${stepIndex + 1} / ${TOUR_STEPS.length}</strong><i><b style="width:${((stepIndex + 1) / TOUR_STEPS.length) * 100}%"></b></i>`;
        popover.wrapper.prepend(progress);

        const skipBtn = document.createElement('button');
        skipBtn.className = 'tour-skip-btn';
        skipBtn.textContent = 'Exit guide';
        skipBtn.onclick = () => {
          d.destroy();
          cleanupInteractiveListener();
          cleanup().then(() => navigate('/'));
        };
        popover.wrapper.appendChild(skipBtn);
      },
      onNextClick: async () => {
        d.destroy();
        if (isLastStep) {
          await cleanup();
          navigate('/');
        } else {
          advanceToStepRef.current(stepIndex + 1);
        }
      },
      onPrevClick: () => {
        d.destroy();
        if (stepIndex > 0) {
          advanceToStepRef.current(stepIndex - 1);
        }
      },
      onCloseClick: () => {
        d.destroy();
        cleanup().then(() => navigate('/'));
      },
    });

    driverRef.current = d;
    setCurrentStep(stepIndex);

    requestAnimationFrame(() => {
      // Route changes and earlier tutorial steps can leave the document or a
      // modal scrolled elsewhere. Put the current target in view first so
      // Driver.js never describes an off-screen control (notably Notes).
      if (stepDef.element) {
        const targetElement = document.querySelector(stepDef.element);
        // The word mistake menu is position:fixed and already visible. Calling
        // scrollIntoView on one of its letter/haraka controls emits a scroll
        // event, and Classroom intentionally closes the menu on any scroll.
        // That left the tour overlay pointing at a popup it had just removed.
        if (!targetElement?.closest('[data-tour="word-popup"]')) {
          targetElement?.scrollIntoView({
            behavior: 'auto',
            block: 'center',
            inline: 'nearest',
          });
        }
      }
      d.drive();

      // Bind immediately after rendering so a fast click cannot beat the
      // interactive listener during the transition between steps.
      if (isInteractive && stepDef.interactiveTarget) {
        setupInteractiveListener(stepIndex, stepDef, d);
      }

      // WebView2 may apply scroll anchoring after conditional UI is inserted
      // (the Notes editor appears above the current viewport). Re-center once
      // that layout shift settles and refresh Driver's stage measurement.
      if (stepDef.element) {
        window.setTimeout(() => {
          if (driverRef.current !== d || !d.isActive()) return;
          const targetElement = document.querySelector(stepDef.element!);
          if (!targetElement?.closest('[data-tour="word-popup"]')) {
            targetElement?.scrollIntoView({
              behavior: 'auto',
              block: 'center',
              inline: 'nearest',
            });
          }
          window.requestAnimationFrame(() => d.refresh());
        }, 300);
      }
    });
  }, [darkMode, cleanup, navigate, cleanupInteractiveListener, setupInteractiveListener]);

  const advanceToStep = useCallback(async (nextStep: number) => {
    if (nextStep >= TOUR_STEPS.length) {
      await cleanup();
      navigate('/');
      return;
    }

    const stepDef = TOUR_STEPS[nextStep];
    let classId = tourClassId;

    // Detect session creation: if we just completed the "Create Session" step (step 12),
    // the URL should now contain the new session ID
    if (stepDef.screen === 'classroom' && !classId) {
      // Check if we're on a classroom URL after session creation
      const match = window.location.pathname.match(/\/sessions\/(.+)/);
      if (match) {
        classId = match[1];
        setTourClassIdState(classId);
        setTourClassId(classId, user?.id); // persist for orphan cleanup
      }
    }

    const targetRoute = screenToRoute(stepDef.screen, classId || undefined);
    // For sessions, check just the pathname
    const currentPathOnly = window.location.pathname;
    const targetPathOnly = targetRoute.split('?')[0];

    const needsNavigation = (() => {
      if (stepDef.screen === 'sessions') {
        return currentPathOnly !== '/sessions';
      }
      if (stepDef.screen === 'classroom') {
        return !currentPathOnly.startsWith('/sessions/');
      }
      return currentPathOnly !== targetPathOnly;
    })();

    if (needsNavigation) {
      setPendingStep(nextStep);
      navigate(targetRoute);
    } else {
      // Same route — wait for element if needed, then show
      if (stepDef.waitForElement) {
        waitForElement(stepDef.waitForElement, () => showStep(nextStep));
      } else {
        showStep(nextStep);
      }
    }
  }, [tourClassId, cleanup, navigate, showStep, user?.id, waitForElement]);

  // Interactive listeners are intentionally stable; route them through the
  // latest step callback so they never advance with first-render state.
  useEffect(() => {
    advanceToStepRef.current = advanceToStep;
  }, [advanceToStep]);

  // Route completion is also observed independently of the initiating button.
  // This guarantees that a network-backed Create/Delete action can finish after
  // its Driver overlay has been removed without losing the next tutorial step.
  useEffect(() => {
    if (!isActive || currentStep < 0) return;
    const stepDef = TOUR_STEPS[currentStep];
    const pathReady =
      (!stepDef.waitForPath || location.pathname === stepDef.waitForPath) &&
      (!stepDef.waitForPathPrefix || location.pathname.startsWith(stepDef.waitForPathPrefix));
    if ((!stepDef.waitForPath && !stepDef.waitForPathPrefix) || !pathReady) return;

    const timer = window.setTimeout(() => {
      if (currentStep === TOUR_STEPS.length - 1) return;
      advanceToStepRef.current(currentStep + 1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentStep, isActive, location.pathname]);

  // When pendingStep is set and we detect a route change, show the step
  useEffect(() => {
    if (pendingStep !== null && isActive) {
      const stepDef = TOUR_STEPS[pendingStep];
      const waitSelector = stepDef?.waitForElement;

      const timer = window.setTimeout(() => {
        if (waitSelector) {
          waitForElement(waitSelector, () => {
            showStep(pendingStep);
            setPendingStep(null);
          });
        } else {
          showStep(pendingStep);
          setPendingStep(null);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [pendingStep, location.pathname, location.search, isActive, showStep, waitForElement]);

  const startTour = useCallback(() => {
    markTourAutoShown(user?.id);
    setIsActive(true);
    setCurrentStep(0);
    setTourClassIdState(null);
    clearTourClassId(user?.id);
    clearTourClassId();

    if (location.pathname !== '/') {
      setPendingStep(0);
      navigate('/');
    } else {
      window.requestAnimationFrame(() => showStep(0));
    }
  }, [location.pathname, navigate, showStep, user?.id]);

  useEffect(() => {
    autoStarted.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (
      user &&
      !hasTourBeenAutoShown(user.id) &&
      location.pathname === '/' &&
      !autoStarted.current &&
      !isActive
    ) {
      autoStarted.current = true;
      const timer = window.setTimeout(startTour, 250);
      return () => window.clearTimeout(timer);
    }
  }, [user, location.pathname, isActive, startTour]);

  const clearPending = useCallback(() => {
    setPendingStep(null);
  }, []);

  return (
    <TourContext.Provider value={{ isActive, currentStep, startTour, pendingStep, clearPending }}>
      {children}
      {/* Tour CSS overrides */}
      <style>{`
        .driver-popover {
          overflow: hidden !important;
          width: min(380px, calc(100vw - 28px)) !important;
          max-width: min(380px, calc(100vw - 28px)) !important;
          padding: 0 24px 18px !important;
          border: 1px solid color-mix(in srgb, var(--gold-500) 42%, transparent) !important;
          border-radius: 8px !important;
          background: var(--bg-card) !important;
          color: var(--text-primary) !important;
          box-shadow: 0 24px 70px rgba(7, 21, 33, 0.28) !important;
          font-family: inherit !important;
        }
        .tour-popover-dark {
          border-color: rgba(214, 184, 111, 0.38) !important;
          background: linear-gradient(155deg, var(--ink-900), var(--ink-950)) !important;
          color: #f8f3e8 !important;
        }
        .tour-progress {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 7px 12px;
          margin: 0 -24px 20px;
          padding: 13px 24px 11px;
          border-bottom: 1px solid color-mix(in srgb, var(--gold-500) 28%, transparent);
          background: color-mix(in srgb, var(--ink-900) 96%, transparent);
          color: var(--gold-400);
        }
        .tour-progress span {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .15em;
        }
        .tour-progress strong {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .06em;
        }
        .tour-progress i {
          grid-column: 1 / -1;
          height: 2px;
          overflow: hidden;
          background: rgba(214, 184, 111, .2);
        }
        .tour-progress b {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, var(--accent-primary), var(--gold-400));
          transition: width 140ms ease;
        }
        .driver-popover-title {
          color: var(--text-primary) !important;
          font-family: Georgia, 'Times New Roman', serif !important;
          font-size: 21px !important;
          font-weight: 600 !important;
          line-height: 1.25 !important;
        }
        .tour-popover-dark .driver-popover-title { color: #fffdf8 !important; }
        .driver-popover-description {
          margin-top: 8px !important;
          color: var(--text-secondary) !important;
          font-size: 14px !important;
          line-height: 1.65 !important;
        }
        .tour-popover-dark .driver-popover-description { color: rgba(248, 243, 232, .72) !important; }
        .driver-popover-description strong { color: var(--accent-primary) !important; font-weight: 700 !important; }
        .tour-popover-dark .driver-popover-description strong { color: var(--gold-400) !important; }
        .driver-popover-footer { margin-top: 18px !important; }
        .driver-popover-navigation-btns { gap: 8px !important; }
        .driver-popover-next-btn,
        .driver-popover-prev-btn {
          min-height: 36px !important;
          padding: 8px 16px !important;
          border-radius: 5px !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          text-shadow: none !important;
        }
        .driver-popover-next-btn {
          border: 1px solid var(--accent-primary) !important;
          background: var(--accent-primary) !important;
          color: #fff !important;
        }
        .driver-popover-next-btn:hover { filter: brightness(1.08); }
        .driver-popover-prev-btn {
          border: 1px solid color-mix(in srgb, var(--gold-500) 45%, transparent) !important;
          background: transparent !important;
          color: var(--text-secondary) !important;
        }
        .tour-popover-dark .driver-popover-prev-btn { color: rgba(248, 243, 232, .78) !important; }
        .tour-skip-btn {
          display: block;
          width: 100%;
          margin-top: 11px;
          padding: 5px;
          border: 0;
          background: transparent;
          color: var(--text-muted);
          font-size: 12px;
          letter-spacing: .03em;
          cursor: pointer;
          text-align: center;
        }
        .tour-popover-dark .tour-skip-btn { color: rgba(248, 243, 232, .5); }
        .tour-skip-btn:hover { color: var(--gold-500); }
        .driver-popover-arrow { display: none !important; }
        @media (max-width: 640px) {
          .driver-popover {
            width: calc(100vw - 20px) !important;
            max-width: calc(100vw - 20px) !important;
            max-height: calc(100dvh - 20px) !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            padding: 0 18px 14px !important;
          }
          .tour-progress {
            gap: 6px 10px;
            margin: 0 -18px 15px;
            padding: 11px 18px 9px;
          }
          .driver-popover-title { font-size: 19px !important; }
          .driver-popover-description {
            margin-top: 6px !important;
            font-size: 13px !important;
            line-height: 1.5 !important;
          }
          .driver-popover-footer { margin-top: 14px !important; }
          .driver-popover-next-btn,
          .driver-popover-prev-btn {
            min-height: 40px !important;
            padding: 8px 13px !important;
          }
          .tour-skip-btn { margin-top: 7px; }
        }
      `}</style>
    </TourContext.Provider>
  );
}
