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

  /** Wait for a DOM element to appear, then call callback. */
  const waitForElement = useCallback((
    selector: string,
    callback: () => void,
    maxWait = 5_000,
  ) => {
    const start = Date.now();
    const check = () => {
      if (document.querySelector(selector)) {
        callback();
      } else if (Date.now() - start < maxWait) {
        window.setTimeout(check, 100);
      } else {
        // Preserve navigation instead of leaving an undismissable overlay if a
        // target is unavailable, while keeping the timeout visible in diagnostics.
        console.warn(`Tutorial target did not appear: ${selector}`);
        callback();
      }
    };
    check();
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
      if (boundElement) {
        boundElement.removeEventListener(eventType, handler);
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

    const handler: EventListener = () => {
      if (disposed || consumed) return;
      consumed = true;

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
          boundElement?.addEventListener(eventType, handler, { once: true });
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
      element.addEventListener(eventType, handler, { once: true });
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

    // Append step counter to description
    if (driverStep.popover) {
      driverStep.popover.description = `${driverStep.popover.description}<br/><span style="color:#64748b;font-size:12px;margin-top:8px;display:inline-block">Step ${stepIndex + 1} of ${TOUR_STEPS.length}</span>`;
    }

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
      prevBtnText: '← Previous',
      // For interactive steps, clicking the highlighted area should pass through
      stagePadding: isInteractive ? 8 : 16,
      allowKeyboardControl: !isInteractive,
      // Render the extra control before Driver.js measures and positions the
      // popover. Adding it afterward makes the popover grow back over the
      // highlighted input, which is especially confusing in the portions modal.
      onPopoverRender: (popover) => {
        if (popover.wrapper.querySelector('.tour-skip-btn')) return;
        const skipBtn = document.createElement('button');
        skipBtn.className = 'tour-skip-btn';
        skipBtn.textContent = 'Skip Tour';
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
      requestAnimationFrame(() => {
        // Route changes and earlier tutorial steps can leave the document or a
        // modal scrolled elsewhere. Put the current target in view first so
        // Driver.js never describes an off-screen control (notably Notes).
        if (stepDef.element) {
          document.querySelector(stepDef.element)?.scrollIntoView({
            behavior: 'auto',
            block: 'center',
            inline: 'nearest',
          });
        }
        d.drive();

        // WebView2 may apply scroll anchoring after conditional UI is inserted
        // (the Notes editor appears above the current viewport). Re-center once
        // that layout shift settles and refresh Driver's stage measurement.
        if (stepDef.element) {
          window.setTimeout(() => {
            if (driverRef.current !== d || !d.isActive()) return;
            document.querySelector(stepDef.element!)?.scrollIntoView({
              behavior: 'auto',
              block: 'center',
              inline: 'nearest',
            });
            window.requestAnimationFrame(() => d.refresh());
          }, 300);
        }

        // For interactive steps: listen for click on the target, then auto-advance
        if (isInteractive && stepDef.interactiveTarget) {
          setupInteractiveListener(stepIndex, stepDef, d);
        }
      });
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

  // When pendingStep is set and we detect a route change, show the step
  useEffect(() => {
    if (pendingStep !== null && isActive) {
      const stepDef = TOUR_STEPS[pendingStep];
      const waitSelector = stepDef?.waitForElement;
      const delay = waitSelector ? 200 : 600;

      const timer = setTimeout(() => {
        if (waitSelector) {
          waitForElement(waitSelector, () => {
            showStep(pendingStep);
            setPendingStep(null);
          });
        } else {
          showStep(pendingStep);
          setPendingStep(null);
        }
      }, delay);
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
      setTimeout(() => showStep(0), 300);
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
      const timer = window.setTimeout(startTour, 800);
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
          border-radius: 16px !important;
          padding: 20px 24px !important;
          width: min(340px, calc(100vw - 32px)) !important;
          max-width: min(340px, calc(100vw - 32px)) !important;
          font-family: inherit !important;
        }
        .driver-popover-description {
          line-height: 1.6 !important;
        }
        .tour-popover-dark {
          background: #1e293b !important;
          border: 1px solid #334155 !important;
          color: #e2e8f0 !important;
        }
        .tour-popover-dark .driver-popover-title {
          color: #f1f5f9 !important;
          font-size: 18px !important;
          font-weight: 700 !important;
        }
        .tour-popover-dark .driver-popover-description {
          color: #94a3b8 !important;
          font-size: 14px !important;
        }
        .tour-popover-dark .driver-popover-description strong {
          color: #22d3ee !important;
        }
        .tour-popover-dark .driver-popover-next-btn {
          background: linear-gradient(to right, #06b6d4, #14b8a6) !important;
          color: white !important;
          border: none !important;
          border-radius: 10px !important;
          padding: 8px 20px !important;
          font-weight: 600 !important;
          text-shadow: none !important;
        }
        .tour-popover-dark .driver-popover-next-btn:hover {
          background: linear-gradient(to right, #0891b2, #0d9488) !important;
        }
        .tour-popover-light {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #334155 !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important;
        }
        .tour-popover-light .driver-popover-title {
          color: #1e293b !important;
          font-size: 18px !important;
          font-weight: 700 !important;
        }
        .tour-popover-light .driver-popover-description {
          color: #64748b !important;
          font-size: 14px !important;
        }
        .tour-popover-light .driver-popover-description strong {
          color: #0891b2 !important;
        }
        .tour-popover-light .driver-popover-next-btn {
          background: linear-gradient(to right, #06b6d4, #14b8a6) !important;
          color: white !important;
          border: none !important;
          border-radius: 10px !important;
          padding: 8px 20px !important;
          font-weight: 600 !important;
          text-shadow: none !important;
        }
        .tour-popover-light .driver-popover-next-btn:hover {
          background: linear-gradient(to right, #0891b2, #0d9488) !important;
        }
        .tour-skip-btn {
          display: block;
          margin-top: 12px;
          padding: 6px 16px;
          border: none;
          background: none;
          color: #64748b;
          font-size: 13px;
          cursor: pointer;
          text-align: center;
          width: 100%;
        }
        .tour-skip-btn:hover {
          color: #94a3b8;
          text-decoration: underline;
        }
        .driver-popover-arrow {
          display: none !important;
        }
      `}</style>
    </TourContext.Provider>
  );
}
