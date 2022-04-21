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

  isHost = displayIsHost(gameDocSnap.data().hostUserId, gameDocSnap.data().hostDisplayName, auth.currentUser.uid);

  displayGameBoard(database, gameid);

  if(isHost)
  {
    gameManagement(database, gameid);
  }

}
main();

function displayIsHost(hostId, hostDisplayName, currentUserId)
{
  const detailsHost = document.createElement('p');
  if(hostId == currentUserId){
    detailsHost.textContent = "You are the host";
    return true;
  }else {
    detailsHost.textContent = "You are NOT the host. The host is: " + hostDisplayName;
    return false;
  }
  gameDetails.appendChild(detailsHost);
}

async function displayGameBoard(database, gameid)
{
    const gameboard = document.getElementById("board");
    const boardState = await getBoardState(database, gameid);

    let boardStateString = boardState.toString();
    console.log(boardStateString)
    gameboard.textContent = boardStateString;

    const boardStateDocRef = doc(database, 'Games', gameid, 'Board', 'boardState');

    const onBoardStateChange = onSnapshot(boardStateDocRef, (newBoardState) => {
      newBoardState = boardStateConverter.fromFirestore(newBoardState);
      console.log("updating boardState");
      let newBoardStateString = newBoardState.toString();
      console.log(newBoardStateString);
      gameboard.textContent = newBoardStateString;
    });
}

async function gameManagement(database, gameid)
{
  const eventFeed = document.getElementById('event-feed');

  const numberOfPhases = 5;
  const playersReadyDocRef = doc(database, 'Games', gameid, 'Board', 'playersReady');
  const boardStateDocRef = doc(database, 'Games', gameid, 'Board', 'boardState').withConverter(boardStateConverter);
  const onReadyChange = onSnapshot(playersReadyDocRef, async (doc) => {
    if(doc.data().isReadyList.every(Boolean))
    {
      const boardState = await getBoardState(database, gameid);
      const programQueues = doc.data().programQueues;

      // boardState.round++;
      // eventFeed.textContent = eventFeed.textContent + "Round " + boardState.round + "\n";
      // for(let i = 0; i < numberOfPhases; i++)
      // {
      //   let phaseSummary = '-Phase ' + i + '\n';
      //   programQueues.forEach((programQueue, j) => {
      //     console.log("Player ", j, ": ", programToString(programQueue['phase-'+i]))
      //     phaseSummary = phaseSummary + "--Player " + j + ": " + JSON.stringify(boardState.playerPositions[j])+ " => " + programToString(programQueue['phase-'+i]) + " => ";
      //     boardState.playerPositions[j] = executeProgram(programQueue['phase-'+i], boardState.playerPositions[j]);
      //     phaseSummary = phaseSummary + JSON.stringify(boardState.playerPositions[j]) + "\n"
      //   });
      //   eventFeed.textContent = eventFeed.textContent + phaseSummary;//This will not display the event feed to other players
      //   setDoc(boardStateDocRef, boardState);
      // }
      boardState.executeProgramQueues(programQueues);
      if(boardState.winner == null)
      {
        let numberOfPlayers = boardState.playerPositions.length;
        updateDoc(playersReadyDocRef, {
          isReadyList: new Array(numberOfPlayers).fill(false)
        });
      }
    }
  });

}

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

}
