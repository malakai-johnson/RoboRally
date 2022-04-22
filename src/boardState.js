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
    this.boardStateListener = function () {console.log("boardStateListener not set, this probably means the bordState is trying to be updated by someone other than the host.");};

    this.numberOfPhases = 5;
  }

  toString()
  {
    let output = '\n';
    if(this.winner != null)
    {
      output = "PLAYER " +  this.winner + " WINS!";
    }
    output = output + "NOTE: north = -y, south = +y, east = +x, west = -x\ni.e. (0,0) is north west corner\n";
    output = output + "Round: " + this.round + "\n";
    output = output + "-Goals:\n"
    for (let i = 0; i < this.goals.length; i++)
    {
      output = output + "Goal " + i + ": " + this.goalToString(this.goals[i]) + "\n";
    }
    output = output + "-Player Positions:\n"
    for(let i = 0; i < this.players.length; i++)
    {
      output = output + "--Player " + i + ": " + this.playerToString(this.players[i]) + "\n";
    }
    return output + '\n';
  }

  printHistory()
  {
    let output = '';
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
    if(player.nextGoal == this.goals.length)
    {
      return "Position: ( " + player.x + ", " + player.y + ", " + player.direction + " ), WINNER!";
    }
    return "Position: ( " + player.x + ", " + player.y + ", " + player.direction + " ), Next Goal: " + player.nextGoal;
  }

  goalToString(goal)
  {
    return "( " + goal.x + ", " + goal.y + " )";
  }

  executeProgramQueues(programQueues)
  {
    this.round++;
    console.log("Executing Round " + this.round);
    this.history.push("Round " + this.round);
    for(let i = 0; i < this.numberOfPhases; i++)
    {
      let phaseSummary = '-Phase ' + i + '\n';
      programQueues.forEach((programQueue, j) => {
        // console.log("Player ", j, ": ", programToString(programQueue['phase-'+i]))
        let nextGoal = this.players[j].nextGoal;
        phaseSummary = phaseSummary + "--Player " + j + ": " + this.playerToString(this.players[j])+ " => " + programToString(programQueue['phase-'+i]) + " => ";
        this.players[j] = executeProgram(programQueue['phase-'+i], this.players[j]);
        phaseSummary = phaseSummary + this.playerToString(this.players[j]) + '\n';
        if (nextGoal < this.players[j].nextGoal)
        {
          phaseSummary = phaseSummary + "Player " + j + " Reached Goal " + nextGoal + "!\n";
        }
      });
      console.log(phaseSummary);
      this.history.push(phaseSummary);
      if(this.checkForWinner())
      {
        console.log("Player " + this.winner + " Wins!");
        this.history.push("Player " + this.winner + " Wins!");
        // break;
      }
      this.boardStateListener();
    }
  }

  checkForWinner()
  {//returns true if a winner is found and sets this.winner to the player number of the winner
    if(this.winner == null)
    {
      console.log("Checking for winner");
      this.players.every((player, i) => {
        if(!player.isWinner)
        {
          if(player.x == this.goals[player.nextGoal].x && player.y == this.goals[player.nextGoal].y)
          {
            console.log("Player " + i + " reached goal " + player.nextGoal);
            player.nextGoal = player.nextGoal + 1;
            // player.nextGoal++;
            if(player.nextGoal == this.goals.length)
            {
              console.log("Found winner: " + i);
              player.isWinner = true;
              this.winner = i;
              // return false;//breaks out of "every" loop
            }
            this.boardStateListener();
          }
        }
        return true;//continues "every" loop
      });
    }

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
    const boardState = boardStateSnap.data();
    console.log("Loading boardState:");
    console.log(boardState.toString());
    return boardState;
  }
  else
  {
    console.log("No boardState!");
    return null;
  }
}
