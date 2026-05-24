import React, { createContext, useContext, useState } from "react";
import { useSearchParams } from "react-router-dom";

export type Tab = "today" | "recipe" | "global" | "member" | "summary" | "template";

interface KdsDashboardState {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isMenuDrawerOpen: boolean;
  setIsMenuDrawerOpen: (open: boolean) => void;
  isHighContrast: boolean;
  toggleHighContrast: () => void;
}

const KdsDashboardContext = createContext<KdsDashboardState | undefined>(undefined);

export const KdsDashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  
  // High contrast mode for kitchen environments
  const [isHighContrast, setIsHighContrast] = useState(() => {
    return localStorage.getItem("kds_high_contrast") === "true";
  });

  const activeTab = (searchParams.get("tab") as Tab) || "today";

  const setActiveTab = (tab: Tab) => {
    setSearchParams({ tab });
  };

  const toggleHighContrast = () => {
    setIsHighContrast(prev => {
      const next = !prev;
      localStorage.setItem("kds_high_contrast", String(next));
      return next;
    });
  };

  return (
    <KdsDashboardContext.Provider value={{
      activeTab,
      setActiveTab,
      isMenuDrawerOpen,
      setIsMenuDrawerOpen,
      isHighContrast,
      toggleHighContrast
    }}>
      <div className={`w-full h-full ${isHighContrast ? 'contrast-125 saturate-150' : ''} transition-all duration-300`}>
        {children}
      </div>
    </KdsDashboardContext.Provider>
  );
};

export const useKdsDashboard = () => {
  const context = useContext(KdsDashboardContext);
  if (context === undefined) {
    throw new Error("useKdsDashboard must be used within a KdsDashboardProvider");
  }
  return context;
};
