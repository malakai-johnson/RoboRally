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
  images
} from './assets.js';

// import {
//   executeProgram,
//   programToString,
// } from './botPrograms.js'

export class BoardState
{
  constructor (round = 0, phase = 0, history = ["~~History~~"], players = new Array({x: 1, y: 1, direction: 'south', nextGoal: 0}), goals = new Array({x: 6, y: 6}), winner = null)
  {
    this.round = round;
    this.phase = phase;
    this.history = history;
    this.players = players;
    this.goals = goals;
    this.winner = winner;
    this.boardStateListener = function () {console.log("boardStateListener not set, this probably means the bordState is trying to be updated by someone other than the host.");};

    this.boardSize = {x: 13, y: 13};
    this.spawnPoints = [
      {x: 1, y: 1, direction: 'south', nextGoal: 0},
      {x: 1, y: this.boardSize.y - 2, direction: 'east', nextGoal: 0},
      {x: this.boardSize.x - 2, y: 1, direction: 'west', nextGoal: 0},
      {x: this.boardSize.x - 2, y: this.boardSize.y - 2, direction: 'north', nextGoal: 0}
    ];

    this.numberOfPhases = 5;
  }

  toString()
  {
    let output = '\n';
    if(this.winner != null)
    {
      output = "PLAYER " + this.winner + " WINS!\n";
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

  toCanvas(canvas)
  {
    // const canvas = document.getElementById("canvas");
    const cellWidth = canvas.width / this.boardSize.x;
    const cellHeight = canvas.height / this.boardSize.y;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#87BC78";
    // ctx.strokeStyle = "green";
    ctx.lineWidth = 1;
    ctx.save();

    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#122A1C";
    ctx.fill();

    //draw grid
    ctx.restore();
    for (let i = 0; i <= this.boardSize.x; i++) {
      const x = i*cellWidth;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= this.boardSize.y; i++) {
      const y = i*cellHeight;
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    //draw images
    const padding = ctx.lineWidth / 2 + 1; //padding

    for (let playerNumber = 0; playerNumber < this.players.length; playerNumber++)
    {
      const x = this.players[playerNumber].x * cellWidth + cellWidth/2;
      const y = this.players[playerNumber].y * cellHeight + cellHeight /2;
      const rotation = this.directionToRotation(this.players[playerNumber].direction);
      const phase = this.phase;
      const boardState = this;

      const img = new Image();
      img.src = images["player"+playerNumber];
      img.onload = function() {
        if(phase == boardState.phase)
        {//do not draw if the boardState has moved on to a new phase
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotation);
          ctx.drawImage(img, -cellWidth/2 - padding, -cellHeight/2 - padding, cellWidth - padding, cellHeight - padding);
          ctx.restore();
        }
      };
    }
    ctx.restore();

    for (let goalNumber = 0; goalNumber < this.goals.length; goalNumber++)
    {
      const x = this.goals[goalNumber].x * cellWidth;
      const y = this.goals[goalNumber].y * cellHeight;

      const img = new Image();
      img.src = images["goal"+goalNumber];
      img.onload = function() {
        console.log("x: ", x, " y: ", y);
        ctx.save();
        ctx.translate(x, y);
        ctx.drawImage(img, padding, padding, cellWidth - padding, cellHeight - padding);
        ctx.restore();
      };
    }
    ctx.restore();

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
    this.players[playerNumber] = this.spawnPoints[playerNumber % this.spawnPoints.length];
    this.boardStateListener();
  }

  playerToString(player)
  {
    if(player.nextGoal == this.goals.length)
    {
      return "Position: ( " + player.x + ", " + player.y + ", " + player.direction + " ), WINNER!";
    }
    return "Position: ( " + player.x + ", " + player.y + ", " + player.direction + " ), Next Goal: " + player.nextGoal;
  }

  directionToRotation(direction)
  {
    const TO_RADIANS = Math.PI/180;
    switch(direction)
    {
      case 'north':
        return 0;
      case 'south':
        return 180 * TO_RADIANS;
      case 'east':
        return 90 * TO_RADIANS;
      case 'west':
        return -90 * TO_RADIANS;
      default:
        console.log("Player direction error");
    }
  }

  goalToString(goal)
  {
    return "( " + goal.x + ", " + goal.y + " )";
  }

  programToString(program)
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

  executeProgram(program, playerNumber)
  {
    // console.log("Executing: ", this.programToString(program), "For Player ", playerNumber, ": ")
    // console.log(this.playerToString(this.players[playerNumber]));
    const directions = ['north', 'east', 'south', 'west'];
    // let updatedPosition = currentPosition;
    switch(program.name)
    {
      case 'move':
        for(let spaces = program.value; spaces > 0; spaces--)
        {
          let x = this.players[playerNumber].x;
          let y = this.players[playerNumber].y;
          switch(this.players[playerNumber].direction)
          {
            case 'north':
              if(this.validMove(x, y, x, y-1))
              {
                this.players[playerNumber].y--;
              }
              break;
            case 'south':
              if(this.validMove(x, y, x, y+1))
              {
                this.players[playerNumber].y++;
              }
              break;
            case 'east':
              if(this.validMove(x, y, x+1, y))
              {
                this.players[playerNumber].x++;
              }
              break;
            case 'west':
              if(this.validMove(x, y, x-1, y))
              {
                this.players[playerNumber].x--;
              }
              break;
          }
        }
        break;
      case 'rotate':
        let newDirectionIndex = (directions.indexOf(this.players[playerNumber].direction) + program.value) % 4;
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

  validMove(x1, y1, x2, y2)
  {
    if(x2 < 0)
    {
      return false;
    }
    if(x2 >= this.boardSize.x)
    {
      return false;
    }
    if(y2 < 0)
    {
      return false;
    }
    if(y2 >= this.boardSize.y)
    {
      return false;
    }

    return true;
  }

  executeProgramQueues(programQueues)
  {
    this.round++;
    console.log("Executing Round " + this.round);
    this.history.push("Round " + this.round);
    for(this.phase = 0; this.phase < this.numberOfPhases; this.phase++)
    {
      let phaseSummary = '-Phase ' + this.phase + '\n';
      programQueues.forEach((programQueue, j) => {
        let nextGoal = this.players[j].nextGoal;
        phaseSummary = phaseSummary + "--Player " + j + ": " + this.playerToString(this.players[j]) + " => " + programToString(programQueue['phase-'+this.phase]) + " => ";
        this.executeProgram(programQueue['phase-'+this.phase], j);
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
    this.phase--;
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
      phase: boardState.phase,
      history: boardState.history,
      players: boardState.players,
      goals: boardState.goals,
      winner: boardState.winner,
    };
  },
  fromFirestore: (snapshot, options) =>
  {
    const data = snapshot.data(options);
    return new BoardState(data.round, data.phase, data.history, data.players, data.goals, data.winner);
  }
}

export function programToString(program)
{
  if(!program) return "";
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

export function dealProgramHands(numberOfPlayers = 1)
{
  console.log("dealing programs");
  const programDeck = [
    {name: 'move', value: 1}, {name: 'move', value: 1}, {name: 'move', value: 1}, {name: 'move', value: 1}, {name: 'move', value: 1}, {name: 'move', value: 1}, {name: 'move', value: 1}, {name: 'move', value: 1},
    {name: 'move', value: 2}, {name: 'move', value: 2}, {name: 'move', value: 2}, {name: 'move', value: 2},
    {name: 'move', value: 3},
    {name: 'rotate', value: -1}, {name: 'rotate', value: -1}, {name: 'rotate', value: -1}, {name: 'rotate', value: -1}, {name: 'rotate', value: -1}, {name: 'rotate', value: -1},
    {name: 'rotate', value: 1}, {name: 'rotate', value: 1}, {name: 'rotate', value: 1}, {name: 'rotate', value: 1}, {name: 'rotate', value: 1}, {name: 'rotate', value: 1},
    {name: 'rotate', value: 2}, {name: 'rotate', value: 2}
  ];
  const programHands = {};
  for(let i = 0; i < numberOfPlayers; i++)
  {
    const programHand = {};
    for(let j = 0; j < 10; j++)
    {
      console.log("i: " + i + " j: " + j);
      programHand['program'+j] = programDeck[Math.floor(Math.random()*programDeck.length)];//choose random program
      programHand['program'+j].place = i;
    }
    if(programHand)
    {
      programHands['hand'+i] = programHand;
    }
  }
  return programHands;
}
