//This will be the script which manages the landing page where players can start or join a game
// import html from "./login.html"

import css from './style.css'

import { getFirebaseConfig } from './firebaseConfig.js'

import {
  BoardState,
  boardStateConverter,
  getBoardState
} from './boardState.js'

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
      // Show start game to logged-in users
      startgameContainer.style.display = 'block';
    } else {
      startLoginButton.textContent = 'LOGIN';
      // Hide start game for non-logged-in users
      startgameContainer.style.display = 'none';
    }
  });


  formStartgame.addEventListener('submit', async (e) => {
    // Prevent the default form redirect
    e.preventDefault();
    // Write a new message to the database collection "guestbook"
    const maxPlayerCount = 4;
    const newGame = doc(database, 'Games', inputGameid.value);
    let newGameSnap = await getDoc(newGame);

    if(newGameSnap.exists()){
      console.log("userId: " + auth.currentUser.uid);
      console.log("gameHostId: " + newGameSnap.data().hostUserId);

      if(auth.currentUser.uid == newGameSnap.data().hostUserId)
      {
        console.log("You own this game, redirecting...");
        localStorage.setItem("gameid", inputGameid.value);
        location.href = '/play.html';
      }
      else if (newGameSnap.data().playerList.some(player => auth.currentUser.uid == player.userId))
      {
        console.log("You are in this game, redirecting...");
        localStorage.setItem("gameid", inputGameid.value);
        location.href = '/play.html';
      }
      else if (newGameSnap.data().playerList.length < maxPlayerCount)
      {
        joinGame(database, auth, inputGameid.value, newGame);
        console.log("You have joined this game, redirecting...");
        localStorage.setItem("gameid", inputGameid.value);
        location.href = '/play.html';
      }
      else
      {
        console.log("The game with gameid '" + inputGameid.value + "' is full.");
        const newGameCreationMessage = document.createElement('p');
        newGameCreationMessage.textContent = "The game with gameid '" + inputGameid.value + "' is full.";
        gameCreationMessages.appendChild(newGameCreationMessage);
      }


    }else {
      initializeGame(database, auth, inputGameid.value, newGame);
      localStorage.setItem("gameid", inputGameid.value);
      const newGameCreationMessage = document.createElement('p');

      newGameSnap = await getDoc(newGame);
      if(newGameSnap.exists()){
        newGameCreationMessage.textContent = "Created new game with gameid: '" + inputGameid.value + "'";
        gameCreationMessages.appendChild(newGameCreationMessage);
        location.href = '/play.html';
      }
      else {
          newGameCreationMessage.textContent = "Failed to create new game with gameid: '" + inputGameid.value + "'";
          gameCreationMessages.appendChild(newGameCreationMessage);
      }
    }
    // clear message input field
    inputGameid.value = '';
    // Return false to avoid redirect
    return false;
  });
}
main();

function initializeGame(database, auth, gameid, gameDoc)
{
  setDoc(gameDoc, {
    gameid: gameid,
    hostUserId: auth.currentUser.uid,
    hostDisplayName: auth.currentUser.displayName,
    timestamp: Date.now(),
    playerList: [{userId: auth.currentUser.uid, username: auth.currentUser.displayName}],
  });
  const boardState = doc(database, 'Games', gameid, 'Board', 'boardState').withConverter(boardStateConverter);
  setDoc(boardState, new BoardState());
  const playersReady = doc(database, 'Games', gameid, 'Board', 'playersReady');
  setDoc(playersReady, {
    winner: null,
    isReadyList: [false],
    programQueues: new Array(),
  });
}

async function joinGame(database, auth, gameid, gameDoc)
{
  const gameDocSnap = await getDoc(gameDoc);
  const newPlayerList = gameDocSnap.data().playerList;

  const playerNumber = newPlayerList.push({userId: auth.currentUser.uid, username: auth.currentUser.displayName}) -1;
  updateDoc(gameDoc, {
    playerList: newPlayerList,
  });

  const boardStateDocRef = doc(database, 'Games', gameid, 'Board', 'boardState').withConverter(boardStateConverter);
  const boardStateSnap = await getDoc(boardStateDocRef);
  const boardState = boardStateSnap.data();
  boardState.addPlayer(playerNumber);
  setDoc(boardStateDocRef, boardState);

  const playersReadyDocRef = doc(database, 'Games', gameid, 'Board', 'playersReady');
  const playersReadyDocSnap = await getDoc(playersReadyDocRef);
  const newIsReadyList = playersReadyDocSnap.data().isReadyList;
  newIsReadyList[playerNumber] = false;
  updateDoc(playersReadyDocRef, {
    isReadyList: newIsReadyList,
  });
}
