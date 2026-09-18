import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, FacebookAuthProvider, signInWithPopup } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const firestoreDb = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('pages_show_list');
facebookProvider.addScope('pages_read_engagement');
facebookProvider.addScope('pages_manage_posts');
facebookProvider.addScope('pages_messaging');
facebookProvider.addScope('public_profile');
facebookProvider.addScope('email');

export { app, signInWithPopup };
