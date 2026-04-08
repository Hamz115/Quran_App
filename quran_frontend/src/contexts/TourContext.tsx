import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { driver, type Driver } from 'driver.js';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';
import {
  TOUR_STEPS,
  createDriverStep,
  getDriverConfig,
  isTourCompleted,
  markTourCompleted,
  setTourClassId,
  getTourClassId,
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

export function useTour() {
  return useContext(TourContext);
}

// Map screen names to routes
function screenToRoute(screen: string, classId?: string): string {
  switch (screen) {
    case 'dashboard':
    case 'dashboard-final':
      return '/dashboard';
    case 'sessions':
      return '/sessions?new=1';
    case 'classroom':
      return classId ? `/sessions/${classId}` : '/dashboard';
    case 'reader':
      return '/reader';
    case 'settings':
      return '/settings';
    default:
      return '/dashboard';
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

  // Auto-start tour on first visit (only once)
  const autoStarted = useRef(false);
  useEffect(() => {
    if (
      user &&
      !isTourCompleted() &&
      location.pathname === '/dashboard' &&
      !autoStarted.current &&
      !isActive
    ) {
      autoStarted.current = true;
      const timer = setTimeout(() => startTour(), 800);
      return () => clearTimeout(timer);
    }
  }, [user?.id]);

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
    markTourCompleted();
  }, [cleanupInteractiveListener]);

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

    const d = driver({
      ...config,
      steps: [driverStep],
      showButtons: isInteractive ? [] : ['next'], // No buttons for interactive steps
      nextBtnText: isLastStep ? 'Finish' : 'Next →',
      // For interactive steps, clicking the highlighted area should pass through
      stagePadding: isInteractive ? 8 : 16,
      allowKeyboardControl: !isInteractive,
      onNextClick: async () => {
        d.destroy();
        if (isLastStep) {
          await cleanup();
          navigate('/dashboard');
        } else {
          advanceToStep(stepIndex + 1);
        }
      },
      onCloseClick: () => {
        d.destroy();
        cleanup().then(() => navigate('/dashboard'));
      },
    });

    driverRef.current = d;
    setCurrentStep(stepIndex);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        d.drive();

        // Add skip button to the popover
        setTimeout(() => {
          const popover = document.querySelector('.driver-popover');
          if (popover && !popover.querySelector('.tour-skip-btn')) {
            const skipBtn = document.createElement('button');
            skipBtn.className = 'tour-skip-btn';
            skipBtn.textContent = 'Skip Tour';
            skipBtn.onclick = () => {
              d.destroy();
              cleanupInteractiveListener();
              cleanup().then(() => navigate('/dashboard'));
            };
            popover.appendChild(skipBtn);
          }
        }, 100);

        // For interactive steps: listen for click on the target, then auto-advance
        if (isInteractive && stepDef.interactiveTarget) {
          setupInteractiveListener(stepIndex, stepDef, d);
        }
      });
    });
  }, [darkMode, cleanup, navigate, cleanupInteractiveListener]);

  /** Set up a click/change listener on the interactive target that auto-advances the tour */
  const setupInteractiveListener = useCallback((stepIndex: number, stepDef: typeof TOUR_STEPS[0], d: Driver) => {
    const target = stepDef.interactiveTarget;
    if (!target) return;

    // For select elements (surah selector, performance dropdown), listen for 'change'
    // For everything else, listen for 'click'
    const checkAndBind = () => {
      const el = document.querySelector(target);
      if (!el) {
        // Element not found yet, retry
        const retryTimer = setTimeout(checkAndBind, 200);
        interactiveListenerRef.current = () => clearTimeout(retryTimer);
        return;
      }

      const isSelectEl = el.tagName === 'SELECT';
      const isTextarea = el.tagName === 'TEXTAREA';
      const eventType = isSelectEl ? 'change' : isTextarea ? 'input' : 'click';

      // For steps that need to wait for a new element to appear (e.g., word popup)
      const waitFor = stepDef.waitForElement;

      const handler = () => {
        if (waitFor) {
          // Wait for the element to appear, then advance
          const waitCheck = () => {
            const waitEl = document.querySelector(waitFor);
            if (waitEl) {
              // Small delay to let animations finish
              setTimeout(() => {
                d.destroy();
                advanceToStep(stepIndex + 1);
              }, 300);
            } else {
              setTimeout(waitCheck, 100);
            }
          };
          waitCheck();
        } else {
          // Advance after a small delay
          setTimeout(() => {
            d.destroy();
            advanceToStep(stepIndex + 1);
          }, 300);
        }
      };

      // For interactive targets inside the driver stage (highlighted area),
      // we need the click to pass through. driver.js allows this by default for the stage.
      el.addEventListener(eventType, handler, { once: true });

      interactiveListenerRef.current = () => {
        el.removeEventListener(eventType, handler);
      };
    };

    // Small delay to let the driver overlay render
    setTimeout(checkAndBind, 200);
  }, []);

  const advanceToStep = useCallback(async (nextStep: number) => {
    if (nextStep >= TOUR_STEPS.length) {
      await cleanup();
      navigate('/dashboard');
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
        setTourClassId(classId); // persist for orphan cleanup
      }
    }

    const targetRoute = screenToRoute(stepDef.screen, classId || undefined);
    const currentPath = window.location.pathname + window.location.search;

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
  }, [currentStep, tourClassId, cleanup, navigate, showStep]);

  /** Wait for a DOM element to appear, then call callback */
  const waitForElement = (selector: string, callback: () => void, maxWait = 5000) => {
    const start = Date.now();
    const check = () => {
      if (document.querySelector(selector)) {
        callback();
      } else if (Date.now() - start < maxWait) {
        setTimeout(check, 100);
      } else {
        // Element never appeared, skip this step
        callback();
      }
    };
    check();
  };

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
  }, [pendingStep, location.pathname, location.search, isActive]);

  // Listen for session creation: when URL changes to /sessions/<id>
  // and we're in the tour, capture the session ID
  useEffect(() => {
    if (isActive) {
      const match = location.pathname.match(/\/sessions\/(.+)/);
      if (match && match[1] !== 'new' && !tourClassId) {
        const newClassId = match[1];
        setTourClassIdState(newClassId);
        setTourClassId(newClassId);
      }
    }
  }, [location.pathname, isActive, tourClassId]);

  const startTour = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
    setTourClassIdState(null);
    clearTourClassId();

    if (location.pathname !== '/dashboard') {
      setPendingStep(0);
      navigate('/dashboard');
    } else {
      setTimeout(() => showStep(0), 300);
    }
  }, [location.pathname, navigate, showStep]);

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
          max-width: 380px !important;
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
