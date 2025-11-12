import { useEffect, useRef } from 'react';
import { debounce } from 'lodash';

interface UseFormPersistenceOptions {
  key: string;
  formData: any;
  enabled?: boolean;
}

export function useFormPersistence({ key, formData, enabled = true }: UseFormPersistenceOptions) {
  const storageKey = `trip-form-draft-${key}`;
  const isInitialMount = useRef(true);

  // Load saved data on mount
  useEffect(() => {
    if (!enabled) return;

    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Error loading form draft:', error);
    }
    return null;
  }, []);

  // Save data to localStorage on changes (debounced)
  const saveToLocalStorage = useRef(
    debounce((data: any) => {
      if (!enabled) return;

      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (error) {
        console.error('Error saving form draft:', error);
      }
    }, 500)
  ).current;

  useEffect(() => {
    // Skip saving on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (enabled) {
      saveToLocalStorage(formData);
    }
  }, [formData, enabled, saveToLocalStorage]);

  // Clear saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing form draft:', error);
    }
  };

  return {
    clearSavedData,
  };
}
