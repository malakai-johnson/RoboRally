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
  constructor (round = 0, players = new PlayerStates())
  {
    this.round = round;
    this.players = players;
  }
  toString()
  {
    let output = "Round: " + this.round + "\n";
    // output = output + "Player 0: " + JSON.stringify(this.players[0]) + "\n";
    for(let i = 0; i < this.players.length; i++)
    {
      output = output + this.players.toString();
    }
    return output;
  }
}

export const boardStateConverter = {
  toFirestore: (boardState) => {
    return {
      round: boardState.round,
      players: boardState.players.withConverter(playerStatesConverter),
    };
  },
  fromFirestore: (snapshot, options) =>
  {
    const data = snapshot.data(options);
    return new BoardState(data.round, data.players.withConverter(playerStatesConverter));
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

export class PlayerStates
{
  constructor (players = new Array(new Player()))
  {
    this.players = players;
  }

  toString()
  {
    outputString = "";
    this.players.forEach((player, i) => {
      outputString = outputString + "Player " + i + ": " + player.toString() + "\n";
    });
    return outputString;
  }

  addPlayerState(newPlayer = new Player())
  {
    this.players.push(newPlayer);
  }
}

export const playerStatesConverter = {
  toFirestore: (playerStates) => {
    const playerStatesArray = newArray();
    playerStates.forEach((player, i) => {
      playerStatesArray.push(player.withConverter(playerConverter));
    });

    return {
      players: playerStatesArray,
    };
  },
  fromFirestore: (snapshot, options) =>
  {
    const data = snapshot.data(options);
    return new PlayerStates(data.players);
  }
}

export class Player
{
  constructor (position = [0, 0], direction = "north", isReady = false, nextProgram = null)
  {
    this.position = position;
    this.direction = direction;
    this.isReady = isReady;
    this.nextProgram = nextProgram;
  }

  toString()
  {
    return "Position: " + this.position + ", Direction: " + direction + ") Ready: " + isReady;
  }
}

export const playerConverter = {
  toFirestore: (player) => {
    return {
      position: player.postition,
      direction: player.direction,
      ready: player.ready,
      nextProgram: player.nextProgram,
    };
  },
  fromFirestore: (snapshot, options) =>
  {
    const data = snapshot.data(options);
    return new Player(data.position, data.direction, data.ready, data.nextProgram);
  }
}
