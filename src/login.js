//This will be the script which manages the landing page where players can start or join a game
import html from "./login.html"

import { getFirebaseConfig } from './firebaseConfig.js'

// Firebase App (the core Firebase SDK) is always required
import { initializeApp } from 'firebase/app';

// Add the Firebase products and methods that you want to use
import {
  getAuth,
  EmailAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';

import * as firebaseui from 'firebaseui';


console.log("load login.js");
main();
async function main()
{
  console.log('begin main');

  // Document elements
  const startLoginButton = document.createElement("button");
  startLoginButton.id = 'startLogin';
  startLoginButton.innerHTML = 'LOGIN';
  document.body.appendChild(startLoginButton);

  //
  // let rsvpListener = null;
  // let guestbookListener = null;

  const app = initializeApp(getFirebaseConfig());
  let auth = getAuth();
  let database = getFirestore();

  if (auth)
  {
    console.log('auth was created');
  } else
  {
    console.log('auth was not created');
  }

  const firebaseuiAuthContainer = document.createElement("section");
  firebaseuiAuthContainer.id = "firebaseui-auth-container";
  document.body.appendChild(firebaseuiAuthContainer);

  const uiConfig = {
    credentialHelper: firebaseui.auth.CredentialHelper.NONE,
    signInOptions: [
      // Email / Password Provider.
      EmailAuthProvider.PROVIDER_ID,
    ],
    callbacks: {
      signInSuccessWithAuthResult: function (authResult, redirectUrl) {
        // Handle sign-in.
        // Return false to avoid redirect.
        return false;
      },
    },
  };

    // Initialize the FirebaseUI widget using Firebase
  const ui = new firebaseui.auth.AuthUI(getAuth());

    // Listen to RSVP button clicks
  startLoginButton.addEventListener('click', () => {
    if (auth.currentUser) {
      // User is signed in; allows user to sign out
      signOut(auth);
    } else {
      // No user is signed in; allows user to sign in
      ui.start('#firebaseui-auth-container', uiConfig);
    }
  });

  // Listen to the current Auth state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      startLoginButton.textContent = 'LOGOUT';
      // Show guestbook to logged-in users
      // guestbookContainer.style.display = 'block';
      // Subscribe to the guestbook collection
      // subscribeGuestbook();
    } else {
      startLoginButton.textContent = 'LOGIN';
      // Hide guestbook for non-logged-in users
      // guestbookContainer.style.display = 'none';
      // Unsubscribe from the guestbook collection
      // unsubscribeGuestbook();
    }
  });


}
