import { FacebookPage, SystemConfig } from '../types.js';

const STORAGE_KEYS = {
  APP_ID: 'assistante_meta_app_id',
  APP_ID_ALT: 'AV_META_APP_ID',
  APP_SECRET: 'assistante_meta_app_secret',
  APP_SECRET_ALT: 'AV_META_APP_SECRET',
  VERIFY_TOKEN: 'assistante_meta_verify_token',
  PAGES: 'assistante_connected_pages',
  ACTIVE_PAGE_ID: 'assistante_active_page_id',
  HIDE_DEMO: 'assistante_hide_demo_pages',
};

export const localPersistence = {
  getAppId: (): string => {
    try {
      return (
        localStorage.getItem(STORAGE_KEYS.APP_ID) ||
        localStorage.getItem(STORAGE_KEYS.APP_ID_ALT) ||
        ''
      );
    } catch {
      return '';
    }
  },

  setAppId: (appId: string) => {
    try {
      if (appId) {
        localStorage.setItem(STORAGE_KEYS.APP_ID, appId);
        localStorage.setItem(STORAGE_KEYS.APP_ID_ALT, appId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.APP_ID);
        localStorage.removeItem(STORAGE_KEYS.APP_ID_ALT);
      }
    } catch {}
  },

  getAppSecret: (): string => {
    try {
      return (
        localStorage.getItem(STORAGE_KEYS.APP_SECRET) ||
        localStorage.getItem(STORAGE_KEYS.APP_SECRET_ALT) ||
        ''
      );
    } catch {
      return '';
    }
  },

  setAppSecret: (secret: string) => {
    try {
      if (secret) {
        localStorage.setItem(STORAGE_KEYS.APP_SECRET, secret);
        localStorage.setItem(STORAGE_KEYS.APP_SECRET_ALT, secret);
      } else {
        localStorage.removeItem(STORAGE_KEYS.APP_SECRET);
        localStorage.removeItem(STORAGE_KEYS.APP_SECRET_ALT);
      }
    } catch {}
  },

  getPages: (): FacebookPage[] | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PAGES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  setPages: (pages: FacebookPage[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PAGES, JSON.stringify(pages));
    } catch {}
  },

  getActivePageId: (): string => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_PAGE_ID) || '';
    } catch {
      return '';
    }
  },

  setActivePageId: (id: string) => {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PAGE_ID, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_PAGE_ID);
      }
    } catch {}
  },

  getHideDemo: (): boolean => {
    try {
      return localStorage.getItem(STORAGE_KEYS.HIDE_DEMO) === 'true';
    } catch {
      return false;
    }
  },

  setHideDemo: (hide: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEYS.HIDE_DEMO, hide ? 'true' : 'false');
    } catch {}
  },
};

