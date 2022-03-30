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
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';

import * as firebaseui from 'firebaseui';


console.log("load login.js");
async function main()
{
  console.log('begin main');

  // Document elements
  // const startLoginButton = document.createElement("button");
  // startLoginButton.id = 'startLogin';
  // startLoginButton.innerHTML = 'LOGIN';
  // document.body.appendChild(startLoginButton);

  const startLoginButton = document.getElementById('startLogin');

  const guestbookContainer = document.getElementById('guestbook-container');
  const formMessage = document.getElementById('leave-message');
  const input = document.getElementById('message');
  const guestbook = document.getElementById('guestbook');

  const startgameContainer = document.getElementById('startgame-container');
  const formStartgame = document.getElementById('enter-gameid');
  const inputGameid = document.getElementById('gameid');
  const gameCreationMessages = document.getElementById('game-creation-messages');



  //
  // let rsvpListener = null;
  // let guestbookListener = null;

  const app = initializeApp(getFirebaseConfig());
  let auth = getAuth();
  let database = getFirestore();
  let guestbookListener = null;


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
      guestbookContainer.style.display = 'block';
      startgameContainer.style.display = 'block';
      // Subscribe to the guestbook collection
      subscribeGuestbook(database, guestbookListener);
    } else {
      startLoginButton.textContent = 'LOGIN';
      // Hide guestbook for non-logged-in users
      guestbookContainer.style.display = 'none';
      startgameContainer.style.display = 'none';
      // Unsubscribe from the guestbook collection
      unsubscribeGuestbook(guestbookListener);
    }
  });

  // Listen to the form submission
  formMessage.addEventListener('submit', async (e) => {
    // Prevent the default form redirect
    e.preventDefault();
    // Write a new message to the database collection "guestbook"

    addDoc(collection(database, 'guestbook'), {
      text: input.value,
      timestamp: Date.now(),
      name: auth.currentUser.displayName,
      userId: auth.currentUser.uid,
    });

    // clear message input field
    input.value = '';
    // Return false to avoid redirect
    return false;
  });

  formStartgame.addEventListener('submit', async (e) => {
    // Prevent the default form redirect
    e.preventDefault();
    // Write a new message to the database collection "guestbook"

    const newGame = doc(database, 'Games', inputGameid.value);
    const newGameSnap = await getDoc(newGame);

    if(newGameSnap.exists()){
      console.log("userId: " + auth.currentUser.uid);
      console.log("gameHostId: " + newGameSnap.data().hostUserId);
      if(auth.currentUser.uid == newGameSnap.data().hostUserId)
      {
        console.log("You own this game, redirectiong...");
        localStorage.setItem("gameid", inputGameid.value);
        location.href = '/host.html';
      }
      console.log("the gameid '" + inputGameid.value + "' is taken.");
      const newGameCreationMessage = document.createElement('p');
      newGameCreationMessage.textContent = "the gameid '" + inputGameid.value + "' is taken.";
      gameCreationMessages.appendChild(newGameCreationMessage);

    }else {
      setDoc(newGame, {
        gameid: inputGameid.value,
        hostUserId: auth.currentUser.uid,
        hostDisplayName: auth.currentUser.displayName,
        timestamp: Date.now(),
        playerList: [{userId: auth.currentUser.uid, username: auth.currentUser.displayName}],
      });
      localStorage.setItem("gameid", inputGameid.value);
      const newGameCreationMessage = document.createElement('p');
      newGameCreationMessage.textContent = "Created new game with gameid: '" + inputGameid.value + "'";
      gameCreationMessages.appendChild(newGameCreationMessage);

      location.href = '/host.html';
    }
    // clear message input field
    inputGameid.value = '';
    // Return false to avoid redirect
    return false;
  });
}
main();

function subscribeGuestbook(database, guestbookListener) {
  const q = query(collection(database, 'guestbook'), orderBy('timestamp', 'desc'));
  guestbookListener = onSnapshot(q, (snaps) => {
    // Reset page
    guestbook.innerHTML = '';
    // Loop through documents in database
    snaps.forEach((doc) => {
      // Create an HTML entry for each document and add it to the chat
      const entry = document.createElement('p');
      entry.textContent = doc.data().name + ': ' + doc.data().text;
      guestbook.appendChild(entry);
    });
  });
}
// Unsubscribe from guestbook updates
function unsubscribeGuestbook(guestbookListener) {
  if (guestbookListener != null) {
    guestbookListener();
    guestbookListener = null;
  }
}
