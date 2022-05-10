//This will be the script which handles the player's hand and move choices.
import { getFirebaseConfig } from './firebaseConfig.js'

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

export class Player
{
  constructor (playerNumber, isReady = false, programQueue = new Array())
  {
    this.playerNumber = playerNumber;
    this.programQueue = programQueue;
    this.queueListener = function () {console.log("queueListener not set");};
    this.isReady = isReady;
    this.readyListener = function () {console.log("readyListener not set");};
    console.log("Created new Player: " + this.toString());
  }

  toString()
  {
    return "Player " + this.playerNumber + ": {isReady:" + this.isReady + ", " + this.queueString() + ", isQueueFull: " + this.isQueueFull() + "}";
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
    console.log("Ready Down");
    this.clearQueue();
    this.readyListener();
  }

  setReady(isReady)
  {
    this.isReady = isReady;
    this.readyListener();
  }

  setReadyListener(newListener)
  {
    this.readyListener = newListener;
  }

}

export async function setPlayerReady(playersReadyDocRef, playerNumber, isReady, playerProgramQueue = {})
{
  const playersReadyDocSnap = await getDoc(playersReadyDocRef);
  if(playersReadyDocSnap.exists())
  {
    let readyList = playersReadyDocSnap.data().isReadyList;
    console.log("readyList.length: " + readyList.length);
    let programQueues = playersReadyDocSnap.data().programQueues;
    readyList[playerNumber] = isReady;
    programQueues[playerNumber] = playerProgramQueue;
    console.log("ReadyList:" + readyList);
    console.log(programQueues);
    updateDoc(playersReadyDocRef, {
      isReadyList: readyList,
      programQueues: programQueues,
    });
  }
}
