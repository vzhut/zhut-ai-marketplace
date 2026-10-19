import { createContext, useContext } from 'react';

interface UiValue {
  /** Moves focus to the header search box (used after the home hero input hands over to the search page). */
  focusSearch: () => void;
  openPalette: () => void;
  openBasket: () => void;
}

export const UiContext = createContext<UiValue | null>(null);

export function useUi(): UiValue {
  const value = useContext(UiContext);
  if (!value) throw new Error('useUi must be used inside the layout');
  return value;
}
