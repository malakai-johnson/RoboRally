//This will be the script which manages the game logic and dispalys the board.
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

async function main()
{
  const gameid = localStorage.getItem("gameid");
  if(gameid == null){
    console.log("gameid undefined");
    location.href = '/login.html';
  }

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

  const gameDocRef = doc(database, 'Games', gameid);
  const gameDocSnap = await getDoc(gameDocRef);
  let isHost;

  console.log("Game ID: " + gameid);
  const gameDetails = document.getElementById("game-details");
  const detailsGameID = document.createElement('p');
  detailsGameID.textContent = "Game ID: " + gameid;
  gameDetails.appendChild(detailsGameID);

  const detailsHost = document.createElement('p');
  if(gameDocSnap.data().hostUserId == auth.currentUser.uid){
    detailsHost.textContent = "You are the host";
    isHost = true;
  }else {
    detailsHost.textContent = "You are NOT the host. The host is: " + gameDocSnap.data().hostDisplayName;
    isHost = false;
  }
  gameDetails.appendChild(detailsHost);

  const gameboard = document.getElementById("board");
  const boardState = await getBoardState(database, gameid);
  let boardStateString = boardState.toString();
  console.log(boardStateString)
  gameboard.textContent = boardStateString;

}
main();
