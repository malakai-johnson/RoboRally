
export class ProgramRecord
{
  constructor ()
  {
    this.numberOfPlayers = 1;
    this.playersReady = [false];
    this.nextPlayerPrograms = [null];
    this.history = [];
  }

  get isAllReady()
  {
    return this.allPlayersReady();
  }

  allPlayersReady()
  {
    return this.playersReady.every(Boolean);
  }

  get nextPlayerPrograms()
  {
    if (allPlayersReady())
    {
      this.history.push(this._nextPlayersReady);
      this._nextPlayersReady = [null];
    }
  }

  setNextPlayerProgram(playerNumber, program)
  {
    this.nextPlayerPrograms[playerNumber] = program;
    this.playersReady[playerNumber] = true;
  }

  addPlayer()
  {
    this.numberOfPlayers++;
    this.playersReady.push(false);
  }
}

export const programRecordConverter = {
  toFirestore: (programRecord) => {
    return {
      playersReady: programRecord.playersReady,
      nextPlayerPrograms: programRecord.nextPlayerPrograms,
      history: programRecord.history,
    };
  },
  fromFirestore: (snapshot, options) =>
  {
      const data = snapshot.data(options);
      return new ProgramRecord();
  }
}

export class Program
{
  constructor(name, value)
  {
    this.name = name;
    this.value = value;
  }

  toString()
  {
    return "{ '" + this.name + "', " + this.value + "}";
  }

  get newPosition(currentPosition)
  {
    const directions = ['north', 'east', 'south', 'west'];
    let updatedPosition = currentPosition;
    switch(program.name)
    {
      case 'move':
        switch(currentPosition.direction)
        {
          case 'north':
            updatedPosition.y -= this.value;
            break;
          case 'south':
            updatedPosition.y += thsi.value;
            break;
          case 'east':
            updatedPosition.x += thsi.value;
            break;
          case 'west':
            updatedPosition.x -= this.value;
            break;
        }
        break;
      case 'rotate':
        let newDirectionIndex = (directions.indexOf(currentPosition.direction) + this.value) % 4;
        if(newDirectionIndex >= 0)
        {
          updatedPosition.direction = directions[newDirectionIndex];
        }
        else
        {
          updatedPosition.direction = directions[newDirectionIndex + 4];
        }
        break;
      default:
        console.log("Invalid program name");
        break;
    }
    return newPosition;
  }
}

export function programExecution(program, currentPosition)
{
  const directions = ['north', 'east', 'south', 'west'];
  let updatedPosition = currentPosition;
  switch(program.name)
  {
    case 'move':
      switch(currentPosition.direction)
      {
        case 'north':
          updatedPosition.y -= program.value;
          break;
        case 'south':
          updatedPosition.y += program.value;
          break;
        case 'east':
          updatedPosition.x += program.value;
          break;
        case 'west':
          updatedPosition.x -= progam.value;
          break;
      }
      break;
    case 'rotate':
      let newDirectionIndex = (directions.indexOf(currentPosition.direction) + program.value) % 4;
      if(newDirectionIndex >= 0)
      {
        updatedPosition.direction = directions[newDirectionIndex];
      }
      else
      {
        updatedPosition.direction = directions[newDirectionIndex + 4];
      }
      break;
    default:
      console.log("Invalid program name");
      break;
  }
}