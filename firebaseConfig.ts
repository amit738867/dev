import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore} from 'firebase/firestore' ;


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDfqDhYZFa_0OqMsgJwpq7Ma2WDQ6VXbyU",
  authDomain: "omnicapture-120ae.firebaseapp.com",
  projectId: "omnicapture-120ae",
  storageBucket: "omnicapture-120ae.appspot.com",
  messagingSenderId: "172420465739",
  appId: "1:172420465739:web:34ac53ff206fe2e78739ce",
 // measurementId: "G-4JF72XM92J"
};
// Initialize Firebase
const FIREBASE_APP = initializeApp(firebaseConfig);
export const FIREBASE_AUTH = getAuth(FIREBASE_APP);
export const FIRESTORE_DB= getFirestore(FIREBASE_APP);
