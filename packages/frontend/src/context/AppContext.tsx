import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface AppContextValue {
  /** True when the backend health check is failing */
  isBackendDown: boolean;
  setIsBackendDown: (down: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [isBackendDown, setIsBackendDown] = useState(false);

  const value = useMemo<AppContextValue>(
    () => ({ isBackendDown, setIsBackendDown }),
    [isBackendDown],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  return ctx;
}
