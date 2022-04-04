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
  constructor (round = 0, player_0 = {x: 0, y: 0, direction: 'north'}, player_1 = null, player_2 = null, player_3 = null, player_4 = null, player_5 = null, player_6 = null, player_7 = null)
  {
    this.round = round;
    this.player_0 = player_0;
    this.player_1 = player_1;
    this.player_2 = player_2;
    this.player_3 = player_3;
    this.player_4 = player_4;
    this.player_5 = player_5;
    this.player_6 = player_6;
    this.player_7 = player_7;
  }
  toString()
  {
    let output = "Round: " + this.round + "\n";
    if(this.player_0)
    {
      output = output+ "Player 0: " + this.player_0 + "\n";
    }
    if(this.player_1)
    {
      output = output+ "Player 1: " + this.player_1 + "\n";
    }
    if(this.player_2)
    {
      output = output+ "Player 2: " + this.player_2 + "\n";
    }
    if(this.player_3)
    {
      output = output+ "Player 3: " + this.player_3 + "\n";
    }
    if(this.player_4)
    {
      output = output+ "Player 4: " + this.player_4 + "\n";
    }
    if(this.player_5)
    {
      output = output+ "Player 5: " + this.player_5 + "\n";
    }
    if(this.player_6)
    {
      output = output+ "Player 6: " + this.player_6 + "\n";
    }
    if(this.player_7)
    {
      output = output+ "Player 7: " + this.player_7 + "\n";
    }
    return output;
  }
}

export const boardStateConverter = {
  toFirestore: (boardState) => {
    return {
      round: boardState.round,
      player_0: boardState.player_0,
      player_1: boardState.player_1,
      player_2: boardState.player_2,
      player_3: boardState.player_3,
      player_4: boardState.player_4,
      player_5: boardState.player_5,
      player_6: boardState.player_6,
      player_7: boardState.player_7,
    };
  },
  fromFirestore: (snapshot, options) =>
  {
    const data = snapshot.data(options);
    return new BoardState(data.round, data.player_0, data.player_1, data.player_2, data.player_3, data.player_4, data.player_5, data.player_6, data.player_7)
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
