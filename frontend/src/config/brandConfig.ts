export interface BrandConfig {
  slug: string;
  name: string;
  primaryColor: string;
  lightColor: string;
  domain: string;
}

export const BRAND_CONFIGS: Record<string, BrandConfig> = {
  byd: {
    slug: 'byd',
    name: 'BYD',
    primaryColor: '#1A5C38',   // BYD green
    lightColor: '#5DAA5A',
    domain: 'byd.pt',
  },
  dongfeng: {
    slug: 'dongfeng',
    name: 'Dongfeng',
    primaryColor: '#1B4FB4',   // Dongfeng medium blue
    lightColor: '#5B8ED6',
    domain: 'dongfeng.pt',
  },
  farizon: {
    slug: 'farizon',
    name: 'Farizon',
    primaryColor: '#1B2C58',   // Farizon dark navy
    lightColor: '#E87722',     // orange accent
    domain: 'farizon.pt',
  },
  geely: {
    slug: 'geely',
    name: 'Geely',
    primaryColor: '#002776',   // Geely very dark navy
    lightColor: '#0066CC',
    domain: 'geely.pt',
  },
  honda: {
    slug: 'honda',
    name: 'Honda',
    primaryColor: '#CC0000',   // Honda red
    lightColor: '#FF4444',
    domain: 'honda.pt',
  },
  hyundai: {
    slug: 'hyundai',
    name: 'Hyundai',
    primaryColor: '#002C5F',   // Hyundai navy
    lightColor: '#00AAD2',     // Hyundai cyan
    domain: 'hyundai.pt',
  },
  nissan: {
    slug: 'nissan',
    name: 'Nissan',
    primaryColor: '#BC0028',   // Nissan crimson
    lightColor: '#E00034',
    domain: 'nissan.pt',
  },
  xpeng: {
    slug: 'xpeng',
    name: 'Xpeng',
    primaryColor: '#061640',   // Xpeng deep navy
    lightColor: '#3478F6',     // Xpeng bright blue
    domain: 'xpeng.pt',
  },
  zeekr: {
    slug: 'zeekr',
    name: 'Zeekr',
    primaryColor: '#0C0C0C',   // Zeekr black
    lightColor: '#00BBCC',     // Zeekr teal
    domain: 'zeekr.pt',
  },
};

export const DEFAULT_BRAND = BRAND_CONFIGS.hyundai;
