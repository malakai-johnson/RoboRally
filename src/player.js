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
  arrayUnion,
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

  const playersReadyDocRef = doc(database, 'Games', gameid, 'Board', 'playersReady');
  const playersReadyDocSnap = await getDoc(playersReadyDocRef);

  const playerList = gameDocSnap.data().playerList;
  console.log("Player List: " + JSON.stringify(playerList));

  let playerNumber = gameDocSnap.data().playerList.findIndex(playerEntry => {
    return playerEntry.userId == auth.currentUser.uid;
  });
  if (playerNumber < 0)
  {
    await updateDoc(gameDocRef, {
      playerList: arrayUnion({userId: auth.currentUser.uid, username: auth.currentUser.displayName})
    });
    playerNumber = gameDocSnap.data().playerList.findIndex(playerEntry => {
      return playerEntry.userId == auth.currentUser.uid;
    });
  }

  const player = new Player(playerNumber);
  console.log(player.toString());

  const programUI = document.getElementById('program-ui');
  const eventFeed = document.getElementById('event-feed');
  const messageCenter = document.getElementById('message-center');

  const button = document.getElementById('button');

  button.addEventListener("click", function(){
    console.log("Clicked button.");
  });

  const programQueue = new Array();

  const buttonMove1 = document.getElementById('move-1');
  const buttonRotateRight = document.getElementById('rotate-right');


  buttonMove1.program = new Program('move', 1);
  buttonMove1.player = player;
  buttonMove1.addEventListener("click", programButton, false);

  buttonRotateRight.program = new Program('rotate', 1);
  buttonRotateRight.player = player;
  buttonRotateRight.addEventListener("click", programButton, false);

  const readyButton = document.getElementById('ready-button');
  readyButton.player = player;
  readyButton.addEventListener('click', readyButtonFunc, false);

  player.setReadyListener(function(){
    console.log(player.toString());
    console.log("player.isReady: " + player.isReady);
    if(player.isReady)
    {
      programUI.style.display = 'none';
      messageCenter.textContent = "Ready. Waiting on other Players.";
      console.log("Ready. Waiting on other Players.");
      setPlayerReady(playersReadyDocSnap, playerNumber, true);
    }
    else {
      console.log("Player not ready.");
      programUI.style.display = 'block';
      setPlayerReady(playersReadyDocSnap, playerNumber, false);
    }
  });


  console.log("end main");
}
main();

function programButton()
{
  this.player.addProgramToQueue(this.program);
}

function readyButtonFunc()
{
  this.player.readyUp();
}

function addProgramToQueue()
{
  console.log("Adding program to queue...")
  if(this.programQueue.length < 5)
  {
    this.programQueue.push(this.program);
    console.log("Program Queue: " + this.programQueue);
  }
  else {
    console.log("Program Queue Full");
  }
}

class Player
{
  constructor (playerNumber, programQueue = new Array(), isReady = false)
  {
    this.playerNumber = playerNumber;
    this.programQueue = programQueue;
    this.isReady = isReady;
    this.readyListener = function () {console.log("readyListener not set");};
  }

  toString()
  {
    return "Player " + this.playerNumber + ": {isReady:" + this.isReady + ", " + this.programQueue + ", isQueueFull: " + this.isQueueFull() + "}";
  }

  addProgramToQueue(program)
  {
    if(!this.isQueueFull())
    {
      console.log("Adding program to queue...")
      this.programQueue.push(program);
    }
    else {
      console.log("Program Queue Full");
    }
    console.log("Program Queue: " + this.programQueue + ", length: " + this.programQueue.length);
  }

  isQueueFull()
  {
    if(this.programQueue.length < 5)
    {
      return false;
    }
    else
    {
      return true;
    }
  }

  readyUp()
  {
    if(this.isQueueFull())
    {
      this.isReady = true;
      console.log("Player " + this.playerNumber + " is ready.");
    }
    else
    {
      console.log("Cannot ready, queue not full.");
    }
    this.readyListener();
  }

  setReadyListener(newListener)
  {
    this.readyListener = newListener;
  }

}

function setPlayerReady(playersReadyDoc, playerNumber, isReady)
{
  if(playersReadyDoc.exists())
  {
    let readyList = playersReadyDoc.data().isReadyList;
    readyList[playerNumber] = isReady;
    updateDoc(playersReadyDoc, {
      isReadyList: readyList,
    });
  }
}
