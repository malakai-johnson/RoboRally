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

export class BoardState
{
  constructor (round = 0, playerPositions = new Array({x: 0, y: 0, direction: 'north'}))
  {
    this.round = round;
    this.playerPositions = playerPositions;
  }
  toString()
  {
    let output = "Round: " + this.round + "\n";
    // output = output + "Player 0: " + JSON.stringify(this.players[0]) + "\n";
    for(let i = 0; i < this.playerPositions.length; i++)
    {
      output = output + "Player " + i + ": " + JSON.stringify(this.players[i]) + "\n";
    }
    return output;
  }

  }
}

export const boardStateConverter = {
  toFirestore: (boardState) => {
    return {
      round: boardState.round,
      playerPositions: boardState.playerPositions,
    };
  },
  fromFirestore: (snapshot, options) =>
  {
    const data = snapshot.data(options);
    return new BoardState(data.round, data.playerPositions);
  }
}

export async function getBoardState(database, gameid)
{
  const boardStateRef = doc(database, "Games", gameid, 'Board', 'boardState').withConverter(boardStateConverter);
  const boardStateSnap = await getDoc(boardStateRef);
  if (boardStateSnap.exists())
  {
    return boardStateSnap.data();
  }
  else
  {
    console.log("No boardState!");
    return null;
  }
}

export async function saveBoardState(database, gameid, boardstate)
{
  
}
