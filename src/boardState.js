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

// import {
//   executeProgram,
//   programToString,
// } from './botPrograms.js'

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
      output = "PLAYER " + this.winner + " WINS!";
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

  executeProgram(program, playerNumber)
  {
    // console.log("Executing: ", programToString(program));
    const directions = ['north', 'east', 'south', 'west'];
    // let updatedPosition = currentPosition;
    switch(program.name)
    {
      case 'move':
        switch(this.players[playerNumber].direction)
        {
          case 'north':
            this.players[playerNumber].y -= program.value;
            break;
          case 'south':
            this.players[playerNumber].y += program.value;
            break;
          case 'east':
            this.players[playerNumber].x += program.value;
            break;
          case 'west':
            this.players[playerNumber].x -= program.value;
            break;
        }
        break;
      case 'rotate':
        let newDirectionIndex = (directions.indexOf(players[playerNumber].direction) + program.value) % 4;
        if(newDirectionIndex >= 0)
        {
          this.players[playerNumber].direction = directions[newDirectionIndex];
        }
        else
        {
          this.players[playerNumber].direction = directions[newDirectionIndex + 4];
        }
        break;
      default:
        console.log("Invalid program name");
        break;
    }
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
        this.players[j] = this.executeProgram(programQueue['phase-'+i], this.players[j]);
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

export function programToString(program)
{
  switch(program.name)
  {
    case 'move':
      return "Move " + program.value;
    case 'rotate':
        switch(program.value % 3)
        {
          case -1:
            return "Rotate Left";
          case 1:
            return "Rotate Right";
          case -2:
          case 2:
            return "U-Turn";
          default:
            return "Invalid turn";
        }
      default:
        return "Invalid program";
  }
}
