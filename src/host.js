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

// async function main()
// {
//   const gameid = localStorage.getItem("gameid");
//   if(gameid == null){
//     console.log("gameid undefined");
//     location.href = '/login.html';
//   }
//
//   const app = initializeApp(getFirebaseConfig());
//   let auth = getAuth();
//   let database = getFirestore();
//
//   if (auth)
//   {
//     console.log('auth was created');
//   } else
//   {
//     console.log('auth was not created');
//   }
//
//   const gameDocRef = doc(database, 'Games', gameid);
//   const gameDocSnap = await getDoc(gameDocRef);
//   let isHost;
//
//   console.log("Game ID: " + gameid);
//   const gameDetails = document.getElementById("game-details");
//   const detailsGameID = document.createElement('p');
//   detailsGameID.textContent = "Game ID: " + gameid;
//   gameDetails.appendChild(detailsGameID);
//
//   isHost = displayIsHost(gameDetails, gameDocSnap.data().hostUserId, gameDocSnap.data().hostDisplayName, auth.currentUser.uid);
//
//   // const boardStateDocRef = doc(database, 'Games', gameid, 'Board', 'boardState').withConverter(boardStateConverter);
//   // const boardStateDocSnap = await getDoc(boardStateDocRef);
//   // let boardState = boardStateDocSnap.data();
//   // displayGameBoard(boardState);
//
//
//
// }
// main();

// export function checkIsHost(gameDetails, hostId, hostDisplayName, currentUserId, boardState)
// {
//   let isHost = false;
//   const detailsHost = document.createElement('p');
//   if(hostId == currentUserId){
//     detailsHost.textContent = "You are the host";
//     isHost = true;
//   }else {
//     detailsHost.textContent = "You are NOT the host. The host is: " + hostDisplayName;
//     isHost = false;
//   }
//   gameDetails.appendChild(detailsHost);
//
//   if(isHost)
//   {
//     boardState.onBoardStateChange(function() {
//       console.log("Updating boardStateDoc")
//       setDoc(boardStateDocRef, boardState);
//       displayGameBoard(boardState);
//     });
//     gameManagement(database, gameid, boardState);
//   }
//   else
//   {
//     const onBoardStateDocChange = onSnapshot(boardStateDocRef, (newBoardState) => {
//       boardState = newBoardState.data();
//       displayGameBoard(boardState);
//     });
//   }
// }

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
    }
  });

}
