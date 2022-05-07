import { getFirebaseConfig } from './firebaseConfig.js'

import css from './style.css'

import {
  gameManagement,
} from './host.js'

import {
  Player,
  setPlayerReady,
} from './player.js'

import {
  BoardState,
  boardStateConverter,
  programToString,
} from './boardState.js'

// import {
//   programToString,
//   Program,
//   ProgramRecord,
//   programRecordConverter
// } from './botPrograms.js'

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

  console.log("Game ID: " + gameid);
  const gameDetails = document.getElementById("game-details");
  const detailsGameID = document.createElement('p');
  detailsGameID.textContent = "Game ID: " + gameid;
  gameDetails.appendChild(detailsGameID);

  //Check if the current user is the host
  let isHost = false;
  const detailsHost = document.createElement('p');
  if(gameDocSnap.data().hostUserId == auth.currentUser.uid){
    detailsHost.textContent = "You are the host";
    isHost = true;
  }else {
    detailsHost.textContent = "You are NOT the host. The host is: " + gameDocSnap.data().hostDisplayName;
    isHost = false;
  }
  gameDetails.appendChild(detailsHost);

  //Set up boardState management
  const boardStateDocRef = doc(database, 'Games', gameid, 'Board', 'boardState').withConverter(boardStateConverter);
  const boardStateDocSnap = await getDoc(boardStateDocRef);
  let boardState = boardStateDocSnap.data();
  displayGameBoard(boardState);

  if(isHost)
  {//if current user isHost, update the database with every change to the local boardState
    boardState.onBoardStateChange(function() {
      console.log("Updating boardStateDoc")
      setDoc(boardStateDocRef, boardState);
      displayGameBoard(boardState);
    });
    gameManagement(database, gameid, boardState);
  }
  else
  {//if the current user is not Host, update the local boardState with ever database change
    const onBoardStateDocChange = onSnapshot(boardStateDocRef, (newBoardState) => {
      boardState = newBoardState.data();
      displayGameBoard(boardState);
    });
  }

  // let isHost = checkIsHost(gameDetails, gameDocSnap.data().hostUserId, gameDocSnap.data().hostDisplayName, auth.currentUser.uid, boardState);

  const playersReadyDocRef = doc(database, 'Games', gameid, 'Board', 'playersReady');
  const playersReadyDocSnap = await getDoc(playersReadyDocRef);


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


  const programUI = document.getElementById('program-ui');
  const eventFeed = document.getElementById('event-feed');
  const messageCenter = document.getElementById('message-center');


  const player = new Player(playerNumber);
  // console.log(player.toString());
  const programQueue = new Array();

  player.setReadyListener(function(){
    console.log(player.toString());
    console.log("player.isReady: " + player.isReady);
    if(player.isReady)
    {
      programUI.style.display = 'none';
      messageCenter.textContent = "Waiting on other Players...";
      setPlayerReady(playersReadyDocRef, playersReadyDocSnap, playerNumber, true, player.queueToFirestore());
    }
    else {
      console.log("Player not ready.");
      programUI.style.display = 'block';
      messageCenter.textContent = "Plan your next play";
      setPlayerReady(playersReadyDocRef, playersReadyDocSnap, playerNumber, false, player.queueToFirestore());
    }
  });

  const onReadyChange = onSnapshot(playersReadyDocRef, (doc) => {
    if(doc.winner)
    {
      messageCenter.textContent = "Player " + doc.winner + " has won!";
    }
    if(!doc.data().isReadyList[player.playerNumber])
    {
      player.readyDown();
    }
  });

  // let playersReadyList = playersReadyDocSnap.data().readyList;
  // console.log("player ready: " + playersReadyList);
  player.setReady(playersReadyDocSnap.data().isReadyList[playerNumber]);

  const programQueueElement = document.getElementById('program-queue');
  player.setQueueListener(function(){
    // console.log("Queue changed");
    programQueueElement.textContent = player.queueString();
    const undoButton = document.getElementById('undo-button');
    const clearButton = document.getElementById('clear-button');
    const readyButton = document.getElementById('ready-button');

    if(player.programQueue.length > 0)
    {
      undoButton.disabled = false;
      clearButton.disabled = false;
    }
    else
    {
      undoButton.disabled = false;
      clearButton.disabled = false;
    }

    if(player.isQueueFull())
    {
      readyButton.disabled = false;
    }
    else
    {
      readyButton.disabled = true;
    }

  });

  createButtons(player);
}
main();

async function displayGameBoard(boardState)
{
    const gameboard = document.getElementById("board");
    console.log(boardState.toString())
    gameboard.textContent = boardState.toString();

    const canvas = document.getElementById("canvas");
    boardState.toCanvas(canvas);

    const eventFeed = document.getElementById('event-feed');
    eventFeed.textContent = boardState.printHistory();
}

function createButtons(player)
{
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
}

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
