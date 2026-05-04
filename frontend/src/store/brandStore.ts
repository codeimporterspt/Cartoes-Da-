import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BrandConfig, DEFAULT_BRAND } from '../config/brandConfig';

interface BrandState {
  brand: BrandConfig;
  setBrand: (brand: BrandConfig) => void;
}

export const useBrandStore = create<BrandState>()(
  persist(
    (set) => ({
      brand: DEFAULT_BRAND,
      setBrand: (brand) => set({ brand }),
    }),
    { name: 'cartoes-da-brand' }
  )
);
