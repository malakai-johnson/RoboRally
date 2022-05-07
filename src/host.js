//This will be the script which manages the game logic and dispalys the board.
import { getFirebaseConfig } from './firebaseConfig.js'

import {
  BoardState,
  boardStateConverter,
  programToString,
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


export async function gameManagement(database, gameid, boardState)
{
  const playersReadyDocRef = doc(database, 'Games', gameid, 'Board', 'playersReady');
  const onReadyChange = onSnapshot(playersReadyDocRef, async (doc) => {
    if(doc.data().isReadyList.every(Boolean))
    {
      console.log("Everyone is ready, executing programs...");
      const programQueues = doc.data().programQueues;

      boardState.executeProgramQueues(programQueues);
      if(boardState.winner == null)
      {//if no one has won
        let numberOfPlayers = boardState.players.length;
        updateDoc(playersReadyDocRef, {
          isReadyList: new Array(numberOfPlayers).fill(false)
        });
      }
      else
      {
        updateDoc(playersReadyDocRef, {
          winner: boardState.winner
        });
      }
    }
  });

}
