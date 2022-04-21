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

import {
  executeProgram,
  programToString,
} from './botPrograms.js'

export class BoardState
{
  constructor (round = 0, history = ["~~History~~"], players = new Array({x: 0, y: 0, direction: 'north', nextGoal: 0, isWinner: false}), goals = new Array({x: 6, y: 6}), winner = null)
  {
    this.round = round;
    this.history = history;
    this.players = players;
    this.goals = goals;
    this.winner = winner;
    this.boardStateListener = function () {console.log("boardStateListener not set");};
  }

  toString()
  {
    let output = "Round: " + this.round + "\n";
    // output = output + "Player 0: " + JSON.stringify(this.players[0]) + "\n";
    for(let i = 0; i < this.players.length; i++)
    {
      output = output + "Player " + i + ": " + this.playerToString(this.players[i]) + "\n";
    }
    return output;
  }

  printHistory()
  {
    output = '';
    this.history.forEach((line, i) => {
      output = output + line + '\n';
    });
    return output;
  }

  addPlayer(playerNumber)
  {
    this.players[playerNumber] = {x: 0, y: 0, direction: 'north', nextGoal: 0};
  }

  playerToString(player)
  {
    return "Position: ( " + player.x + ", " + player.y + ", " + player.direction + " ), Next Goal: " + player.nextGoal;
  }

  executeProgramQueues(programQueues)
  {
    this.round++;
    this.history.push("Round " + this.round);
    for(let i = 0; i < numberOfPhases; i++)
    {
      let phaseSummary = '-Phase ' + i + '\n';
      programQueues.forEach((programQueue, j) => {
        console.log("Player ", j, ": ", programToString(programQueue['phase-'+i]))
        phaseSummary = phaseSummary + "--Player " + j + ": " + this.playerToString(this.players[j])+ " => " + programToString(programQueue['phase-'+i]) + " => ";
        boardState.playerPositions[j] = executeProgram(programQueue['phase-'+i], this.players[j]);
        phaseSummary = phaseSummary + this.playerToString(this.players[j]) + '\n';
      });
      this.history.push(phaseSummary);
      if(this.checkForWinner())
      {
        this.history.push("Player " + this.winner + "Wins!");
        break;
      }
      this.boardStateListener();
    }
  }

  checkForWinner()
  {//returns true if a winner is found and sets this.winner to the player number of the winner
    this.players.every((player, i) => {
      if(!player.isWinner)
      {
        if(player.x == this.goals[player.nextGoal] && player.y == this.goals[player.nextGoal])
        {
          player.nextGoal++;
          if(player.nextGoal == this.goals.length)
          {
            player.isWinner = true;
            this.winner = i;
            return false;//breaks out of "every" loop
          }
          this.boardStateListener();
        }
      }
      return true;//continues "every" loop
    });

    if(this.winner != null)
    {
      return true;
    }
    else
    {
      return false;
    }
  }
  onBoardStateChange(newBoardStateListener)
  {
    this.boardStateListener = newBoardStateListener;
  }
}

export const boardStateConverter = {
  toFirestore: (boardState) => {
    return {
      round: boardState.round,
      history: boardState.history,
      players: boardState.players,
      goals: boardState.goals,
      winner: boardState.winner,
    };
  },
  fromFirestore: (snapshot, options) =>
  {
    const data = snapshot.data(options);
    return new BoardState(data.round, data.history, data.players, data.goals, data.winner);
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
