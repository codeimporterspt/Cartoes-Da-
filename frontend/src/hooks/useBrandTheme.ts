import { useEffect } from 'react';
import { useBrandStore } from '../store/brandStore';

export function useBrandTheme() {
  const { brand } = useBrandStore();
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', brand.primaryColor);
    root.style.setProperty('--brand-light', brand.lightColor);
  }, [brand]);
}
