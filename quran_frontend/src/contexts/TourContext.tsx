import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { driver, type Driver } from 'driver.js';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';
import {
  TOUR_STEPS,
  createDriverStep,
  getDriverConfig,
  createDemoClass,
  cleanupDemoClass,
  cleanupOrphanedDemoClass,
  isTourCompleted,
  markTourCompleted,
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
function screenToRoute(screen: string, demoClassId?: string): string {
  switch (screen) {
    case 'dashboard':
    case 'dashboard-final':
      return '/teacher';
    case 'classroom':
      return demoClassId ? `/teacher/classes/${demoClassId}` : '/teacher';
    case 'reader':
      return '/reader';
    case 'settings':
      return '/settings';
    default:
      return '/teacher';
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
  const [demoClassId, setDemoClassId] = useState<string | null>(null);
  const driverRef = useRef<Driver | null>(null);

  // Cleanup orphaned demo classes on mount
  useEffect(() => {
    cleanupOrphanedDemoClass();
  }, []);

  // Auto-start tour for teachers on first visit
  useEffect(() => {
    if (user && user.role === 'teacher' && !isTourCompleted() && location.pathname === '/teacher') {
      // Small delay to let the dashboard render
      const timer = setTimeout(() => startTour(), 800);
      return () => clearTimeout(timer);
    }
  }, [user?.id, location.pathname]);

  const cleanup = useCallback(async () => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
    if (demoClassId) {
      await cleanupDemoClass();
      setDemoClassId(null);
    }
    setIsActive(false);
    setCurrentStep(-1);
    setPendingStep(null);
    markTourCompleted();
  }, [demoClassId]);

  const showStep = useCallback((stepIndex: number) => {
    if (stepIndex < 0 || stepIndex >= TOUR_STEPS.length) return;

    const stepDef = TOUR_STEPS[stepIndex];
    const driverStep = createDriverStep(stepDef);
    const config = getDriverConfig(darkMode);

    // Destroy previous driver instance
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    const isLastStep = stepIndex === TOUR_STEPS.length - 1;
    const hasSkipBtn = !isLastStep;

    const d = driver({
      ...config,
      steps: [driverStep],
      showButtons: ['next'],
      nextBtnText: isLastStep ? 'Finish' : 'Next →',
      onNextClick: async () => {
        d.destroy();
        if (isLastStep) {
          // Tour complete
          await cleanup();
          navigate('/teacher');
        } else {
          advanceToStep(stepIndex + 1);
        }
      },
      onCloseClick: () => {
        // Should not fire since allowClose=false, but handle anyway
        d.destroy();
        cleanup().then(() => navigate('/teacher'));
      },
    });

    driverRef.current = d;
    setCurrentStep(stepIndex);

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        d.drive();

        // Add skip button manually to the popover after it renders
        if (hasSkipBtn) {
          setTimeout(() => {
            const popover = document.querySelector('.driver-popover');
            if (popover && !popover.querySelector('.tour-skip-btn')) {
              const skipBtn = document.createElement('button');
              skipBtn.className = 'tour-skip-btn';
              skipBtn.textContent = 'Skip Tour';
              skipBtn.onclick = () => {
                d.destroy();
                cleanup().then(() => navigate('/teacher'));
              };
              popover.appendChild(skipBtn);
            }
          }, 100);
        }
      });
    });
  }, [darkMode, cleanup, navigate]);

  const advanceToStep = useCallback(async (nextStep: number) => {
    if (nextStep >= TOUR_STEPS.length) {
      await cleanup();
      navigate('/teacher');
      return;
    }

    const stepDef = TOUR_STEPS[nextStep];
    let classId = demoClassId;

    // If transitioning from dashboard step 2 to classroom step 3, create demo class
    if (nextStep === 3 && !classId) {
      classId = await createDemoClass();
      if (!classId) {
        // Failed to create demo class, skip to reader step
        advanceToStep(6);
        return;
      }
      setDemoClassId(classId);
    }

    // If transitioning to dashboard-final, cleanup first
    if (stepDef.screen === 'dashboard-final' && classId) {
      await cleanupDemoClass();
      setDemoClassId(null);
      classId = null;
    }

    const targetRoute = screenToRoute(stepDef.screen, classId || undefined);
    const currentPath = window.location.pathname;

    if (currentPath !== targetRoute) {
      // Navigate to the target route and set pending step
      setPendingStep(nextStep);
      navigate(targetRoute);
    } else {
      // Same route, show immediately
      showStep(nextStep);
    }
  }, [currentStep, demoClassId, cleanup, navigate, showStep]);

  // When pendingStep is set and we detect a route change, show the step
  useEffect(() => {
    if (pendingStep !== null && isActive) {
      // Wait for the page to render
      const timer = setTimeout(() => {
        showStep(pendingStep);
        setPendingStep(null);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [pendingStep, location.pathname, isActive]);

  const startTour = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
    setDemoClassId(null);

    // Make sure we're on the dashboard
    if (location.pathname !== '/teacher') {
      setPendingStep(0);
      navigate('/teacher');
    } else {
      // Show first step after a frame
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
          line-height: 1.6 !important;
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
        .tour-popover-dark .driver-popover-progress-text {
          color: #64748b !important;
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
          line-height: 1.6 !important;
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
        .tour-popover-light .driver-popover-progress-text {
          color: #94a3b8 !important;
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
