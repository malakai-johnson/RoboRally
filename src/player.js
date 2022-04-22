//This will be the script which handles the player's hand and move choices.
import { getFirebaseConfig } from './firebaseConfig.js'

import {
  BoardState,
  boardStateConverter,
  getBoardState
} from './boardState.js'

import {
  programToString,
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

  // const playerList = gameDocSnap.data().playerList;
  // console.log("Player List: " + JSON.stringify(playerList));

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

  const gameDetails = document.getElementById("game-details");
  const detailsPlayerNumber = document.createElement('p');
  detailsPlayerNumber.textContent = "You are Player " + playerNumber;
  gameDetails.appendChild(detailsPlayerNumber);

  const programQueue = new Array();

  const buttonMove1 = newProgramButton('program-0', {name: 'move', value: 1}, player);
  const buttonMove2 = newProgramButton('program-1', {name: 'move', value: 2}, player);
  const buttonTurnLeft = newProgramButton('program-2', {name: 'rotate', value: -1}, player);
  const buttonTurnRight = newProgramButton('program-3', {name: 'rotate', value: 1}, player);
  const buttonUTurn = newProgramButton('program-4', {name: 'rotate', value: 2}, player);

  const undoButton = document.getElementById('undo-button');
  undoButton.player = player;
  undoButton.addEventListener('click', undoButtonFunc, false);

  const clearButton = document.getElementById('clear-button');
  clearButton.player = player;
  clearButton.addEventListener('click', clearButtonFunc, false);

  const readyButton = document.getElementById('ready-button');
  readyButton.player = player;
  readyButton.addEventListener('click', readyButtonFunc, false);

  const programQueueElement = document.getElementById('program-queue');

  player.setQueueListener(function(){
    // console.log("Queue changed");
    programQueueElement.textContent = player.queueString();
  });

  player.setReadyListener(function(){
    console.log(player.toString());
    console.log("player.isReady: " + player.isReady);
    if(player.isReady)
    {
      programUI.style.display = 'none';
      messageCenter.textContent = "Ready. Waiting on other Players.";
      console.log("Ready. Waiting on other Players.");
      setPlayerReady(playersReadyDocRef, playersReadyDocSnap, playerNumber, true, player.queueToFirestore());
    }
    else {
      console.log("Player not ready.");
      programUI.style.display = 'block';
      setPlayerReady(playersReadyDocRef, playersReadyDocSnap, playerNumber, false, player.queueToFirestore());
    }
  });

  const onReadyChange = onSnapshot(playersReadyDocRef, (doc) => {
    if(!doc.data().isReadyList[player.playerNumber])
    {
      player.readyDown();
    }
  });

  console.log("end main");
}
main();

function programButtonFunc()
{
  this.player.addProgramToQueue(this.program);
}

function undoButtonFunc()
{
  this.player.popQueue();
}

function clearButtonFunc()
{
  this.player.clearQueue();
}

function readyButtonFunc()
{
  this.player.readyUp();
}

class Player
{
  constructor (playerNumber, programQueue = new Array(), isReady = false)
  {
    this.playerNumber = playerNumber;
    this.programQueue = programQueue;
    this.queueListener = function () {console.log("queueListener not set");};
    this.isReady = isReady;
    this.readyListener = function () {console.log("readyListener not set");};
  }

  toString()
  {
    return "Player " + this.playerNumber + ": {isReady:" + this.isReady + ", " + this.programQueue + ", isQueueFull: " + this.isQueueFull() + "}";
  }

  queueString()
  {
    let output = "Program Queue:\n";
    this.programQueue.forEach((program, i) => {
      output = output + "Phase " + i + ": " + programToString(program) + "\n";
    });
    if(this.isQueueFull())
    {
      output = output + "***Queue is Full.***"
    }
    return output;
  }

  addProgramToQueue(program)
  {
    if(!this.isQueueFull())
    {
      // console.log("Adding program to queue...")
      this.programQueue.push(program);
      this.queueListener();
    }
    else {
      console.log("Program Queue Full");
    }
    // console.log("Program Queue: " + this.programQueue + ", length: " + this.programQueue.length);
  }

  popQueue()
  {

    let program = this.programQueue.pop();
    this.queueListener();
    return program;
  }

  clearQueue()
  {
    this.programQueue.length = 0;
    this.queueListener();
  }

  setQueueListener(newListener)
  {
    this.queueListener = newListener;
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

  queueToFirestore()
  {
    const firestoreQueue = {};
    this.programQueue.forEach((program, i) => {
      firestoreQueue['phase-' + i] = program;
    });
    return firestoreQueue;
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

  readyDown()
  {
    this.isReady = false;
    console.log("New Round Begin");
    this.clearQueue();
    this.readyListener();
  }

  setReadyListener(newListener)
  {
    this.readyListener = newListener;
  }

}

function setPlayerReady(playersReadyDocRef, playersReadyDocSnap, playerNumber, isReady, playerProgramQueue = {})
{
  if(playersReadyDocSnap.exists())
  {
    let readyList = playersReadyDocSnap.data().isReadyList;
    let programQueues = playersReadyDocSnap.data().programQueues;
    readyList[playerNumber] = isReady;
    programQueues[playerNumber] = playerProgramQueue;
    updateDoc(playersReadyDocRef, {
      isReadyList: readyList,
      programQueues: programQueues,
    });
  }
}

function newProgramButton(buttonId, program, player)
{
  let programSection = document.getElementById('program-buttons');
  let programButton = document.createElement('button');
  if(programButton == null)
  {
    console.log("Unable to create program button " + buttonId);
  }

  programButton.id = buttonId;
  programButton.program = program;
  programButton.textContent = programToString(program);
  programButton.player = player;
  programButton.addEventListener('click', programButtonFunc, false);

  programSection.appendChild(programButton);
  return programButton
}
