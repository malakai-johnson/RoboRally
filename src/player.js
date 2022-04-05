//This will be the script which handles the player's hand and move choices.
import { getFirebaseConfig } from './firebaseConfig.js'

import {
  BoardState,
  boardStateConverter,
  getBoardState
} from './boardState.js'

import {
  Program,
  ProgramRecord,
  programRecordConverter
} from './botPrograms.js'

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

async function main()
{
  console.log("begin player.js");
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



  const programUI = document.getElementById('program-ui');
  const eventFeed = document.getElementById('event-feed');

  const button = document.getElementById('button');

  if(!button)
  {
    console.log("button not found");
  }

  button.addEventListener("click", function(){
    console.log("Clicked button.");
  });

  let programQueue = [];

  const buttonMove1 = document.getElementById('move-1');
  const buttonRotateRight = document.getElementById('rotate-right');


  buttonMove1.program = new Program('move', 1);
  buttonMove1.programQueue = programQueue;
  buttonMove1.addEventListener("click", addProgramToQueue);

  buttonRotateRight.program - new Program('rotate', 1);
  buttonRotateRight.programQueue = programQueue;
  buttonRotateRight.addEventListener("click", addProgramToQueue);

  console.log("end main");
}
main();


async function getPlayerNumber(auth, gameDoc)
{
  let playerNumber = gameDocSnap.data().playerList.indexOf({userId: auth.currentUser.uid, username: auth.currentUser.displayName});
  if (playerNumber < 0)
  {
    await updateDoc(gameDoc, {
      playerList: arrayUnion({userId: auth.currentUser.uid, username: auth.currentUser.displayName})
    });
    playerNumber = gameDocSnap.data().playerList.indexOf({userId: auth.currentUser.uid, username: auth.currentUser.displayName});
  }

  return playerNumber;
}

function addProgramToQueue(button)
{
  console.log("Adding program to queue...")
  if(button.programQueue.length < 5)
  {
    button.programQueue.push(button.program);
    console.log("Program Queue: " + button.programQueue);
  }
  else {
    console.log("Program Queue Full");
  }
}
