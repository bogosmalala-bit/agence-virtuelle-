import {
  collection,
  doc,
  getDocs,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { firestoreDb } from './firebase.js';
import { FacebookPage, ProductFile, SystemConfig, AssistantSettings, User } from '../types.js';

const COLLECTIONS = {
  PAGES: 'facebook_pages',
  PRODUCTS: 'products',
  CONFIG: 'system_config',
  SETTINGS: 'assistant_settings',
  USERS: 'users',
};

export const firestoreService = {
  // --- Facebook Pages ---
  async getPages(): Promise<FacebookPage[]> {
    try {
      const snapshot = await getDocs(collection(firestoreDb, COLLECTIONS.PAGES));
      const pages: FacebookPage[] = [];
      snapshot.forEach((docSnap) => {
        pages.push(docSnap.data() as FacebookPage);
      });
      return pages;
    } catch (err) {
      console.warn('Firestore getPages warning:', err);
      return [];
    }
  },

  async savePage(page: FacebookPage): Promise<void> {
    try {
      const pageDocId = page.id || `page_${page.page_id}`;
      await setDoc(doc(firestoreDb, COLLECTIONS.PAGES, pageDocId), page, { merge: true });
    } catch (err) {
      console.warn('Firestore savePage warning:', err);
    }
  },

  async savePages(pages: FacebookPage[]): Promise<void> {
    try {
      for (const page of pages) {
        const pageDocId = page.id || `page_${page.page_id}`;
        await setDoc(doc(firestoreDb, COLLECTIONS.PAGES, pageDocId), page, { merge: true });
      }
    } catch (err) {
      console.warn('Firestore savePages warning:', err);
    }
  },

  async deletePage(pageId: string): Promise<void> {
    try {
      await deleteDoc(doc(firestoreDb, COLLECTIONS.PAGES, pageId));
    } catch (err) {
      console.warn('Firestore deletePage warning:', err);
    }
  },

  // --- System Config ---
  async getSystemConfig(): Promise<Partial<SystemConfig> | null> {
    try {
      const docSnap = await getDoc(doc(firestoreDb, COLLECTIONS.CONFIG, 'global'));
      if (docSnap.exists()) {
        return docSnap.data() as Partial<SystemConfig>;
      }
      return null;
    } catch (err) {
      console.warn('Firestore getSystemConfig warning:', err);
      return null;
    }
  },

  async saveSystemConfig(config: Partial<SystemConfig>): Promise<void> {
    try {
      await setDoc(doc(firestoreDb, COLLECTIONS.CONFIG, 'global'), config, { merge: true });
    } catch (err) {
      console.warn('Firestore saveSystemConfig warning:', err);
    }
  },

  // --- User Profile (from Facebook Login) ---
  async saveUser(user: Partial<User>): Promise<void> {
    try {
      const userId = user.id || user.facebook_id || 'current_user';
      await setDoc(doc(firestoreDb, COLLECTIONS.USERS, userId), user, { merge: true });
    } catch (err) {
      console.warn('Firestore saveUser warning:', err);
    }
  },

  // --- Products ---
  async getProducts(): Promise<ProductFile[]> {
    try {
      const snapshot = await getDocs(collection(firestoreDb, COLLECTIONS.PRODUCTS));
      const products: ProductFile[] = [];
      snapshot.forEach((docSnap) => {
        products.push(docSnap.data() as ProductFile);
      });
      return products;
    } catch (err) {
      console.warn('Firestore getProducts warning:', err);
      return [];
    }
  },

  async saveProduct(product: ProductFile): Promise<void> {
    try {
      await setDoc(doc(firestoreDb, COLLECTIONS.PRODUCTS, product.id), product, { merge: true });
    } catch (err) {
      console.warn('Firestore saveProduct warning:', err);
    }
  },

  async deleteProduct(productId: string): Promise<void> {
    try {
      await deleteDoc(doc(firestoreDb, COLLECTIONS.PRODUCTS, productId));
    } catch (err) {
      console.warn('Firestore deleteProduct warning:', err);
    }
  },
};
