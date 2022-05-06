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
  console.log("start");
  const gameid = localStorage.getItem("gameid");
  if(gameid == null){
    console.log("gameid undefined");
    location.href = '/login.html';
  }
  console.log("localStorage isHost: " + localStorage.getItem("isHost"))

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

  if(auth.currentUser)
  {
    console.log("Your User Name: " + auth.currentUser.displayName);
  }
  else
  {
    console.log("Not logged in.");
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("You are now logged in. Username: " + auth.currentUser.displayName);
    } else {
      console.log("Logged out.");
    }
  });


  const gameDocRef = doc(database, 'Games', gameid);
  const gameDocSnap = await getDoc(gameDocRef);

  console.log("Game ID: " + gameid);
  const detailsGameID = document.getElementById("game-id");
  detailsGameID.textContent = "Game ID: " + gameid;

  const playerListElement = document.getElementById('player-list');
  let playerListString = '';
  gameDocSnap.data().playerList.forEach((player, i) => {
    playerListString = playerListString + "Player " + i + ": " + player.username + "\n";
  });
  playerListElement.textContent = playerListString;

  const gameElement = document.getElementById('game');

  let playerNumber = gameDocSnap.data().playerList.findIndex(playerEntry => {
    return playerEntry.userId == auth.currentUser.uid;
  });
  let numberOfPlayers = gameDocSnap.data().playerList.length;
  let gameStarted = gameDocSnap.data().isStarted;

  const detailsPlayerNumber = document.getElementById('player-number');
  detailsPlayerNumber.textContent = "You are Player " + playerNumber;

  const onGameDocChange = onSnapshot(gameDocRef, async (doc) => {
    let playerListString = '';
    doc.data().playerList.forEach((player, i) => {
      playerListString = playerListString + "Player " + i + ": " + player.username + "\n";
    });
    playerListElement.textContent = playerListString;

    gameStarted = doc.data().isStarted;
    if (gameStarted)
    {
      gameElement.style.display = 'block';
    }
    else
    {
      gameElement.style.display = 'none';
    }

    if(auth.currentUser)
    {
      playerNumber = doc.data().playerList.findIndex(playerEntry => {
        return playerEntry.userId == auth.currentUser.uid;
      });
      detailsPlayerNumber.textContent = "You are Player " + playerNumber;
    }
    else
    {
      console.log("Could not find Player Number because you are not logged in.");
    }
    numberOfPlayers = doc.data().playerList.length;
  });


  //Check if the current user is the host
  let isHost = localStorage.getItem("isHost") == "true";
  console.log("isHost: " + isHost + "(" + typeof(isHost) + ")");
  const detailsHost = document.getElementById('is-host');
  // if(gameDocSnap.data().hostUserId == auth.currentUser.uid){
  if(isHost === true){
    detailsHost.textContent = "You are the host";
    if(auth.currentUser.uid != gameDocSnap.data().hostUserId)
    {
      console.log("ERROR: You are hosting, but are not the host. host is: " + gameDocSnap.data().hostDisplayName);
    }
  }else {
    detailsHost.textContent = "You are NOT the host. The host is: " + gameDocSnap.data().hostDisplayName;
  }

  //Set up boardState management
  const boardStateDocRef = doc(database, 'Games', gameid, 'Board', 'boardState').withConverter(boardStateConverter);
  const boardStateDocSnap = await getDoc(boardStateDocRef);
  let boardState = boardStateDocSnap.data();
  displayGameBoard(boardState);

  const hostControls = document.getElementById("host-controls");
  if(isHost === true)
  {
    hostControls.style.display = 'block';
    if(!gameStarted)
    {
      const allInButton = document.createElement('button');
      allInButton.textContent = "Start Game!";
      allInButton.addEventListener('click', async function() {
        startGame(gameDocRef, boardState, numberOfPlayers);
        allInButton.style.display = 'none';
      });
      hostControls.appendChild(allInButton);
    }
  }
  else
  {
    hostControls.style.display = 'none';
  }

  if(isHost === true)
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
  let playersReadyDocSnap = await getDoc(playersReadyDocRef);

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
      messageCenter.textContent = "Ready. Waiting on other Players.";
      console.log("Ready. Waiting on other Players.");
      player.queueString();
      setPlayerReady(playersReadyDocRef, playersReadyDocSnap, playerNumber, true, player.queueToFirestore());
    }
    else {
      console.log("Player not ready.");
      programUI.style.display = 'block';
      // setPlayerReady(playersReadyDocRef, playersReadyDocSnap, playerNumber, false, player.queueToFirestore());
    }
  });

  const onReadyChange = onSnapshot(playersReadyDocRef, (doc) => {
    if(!doc.data().isReadyList[player.playerNumber])
    {
      player.readyDown();
    }
    playersReadyDocSnap = doc;
  });

  // let playersReadyList = playersReadyDocSnap.data().readyList;
  // console.log("player ready: " + playersReadyList);
  player.setReady(playersReadyDocSnap.data().isReadyList[playerNumber]);

  const programQueueElement = document.getElementById('program-queue');
  player.setQueueListener(function(){
    // console.log("Queue changed");
    programQueueElement.textContent = player.queueString();
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

async function startGame(gameDocRef, boardState, numberOfPlayers)
{
  await updateDoc(gameDocRef, {
    isStarted: true
  });

  for(let i = 1; i < numberOfPlayers; i++)
  {
    boardState.addPlayer(i);
  }
}
