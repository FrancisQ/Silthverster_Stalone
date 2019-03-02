const bodyParser = require('body-parser')
const express = require('express')
const logger = require('morgan')
const app = express()
const {
  fallbackHandler,
  notFoundHandler,
  genericErrorHandler,
  poweredByHandler
} = require('./handlers.js')

// For deployment to Heroku, the port needs to be set using ENV, so
// we check for the port number in process.env
app.set('port', (process.env.PORT || 9001))

app.enable('verbose errors')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(poweredByHandler)

// --- SNAKE LOGIC GOES BELOW THIS LINE ---
//OBJECTS
function Food(x,y, snakeHead) {
    this.x= x,
    this.y= y,
    this.distanceX= Math.abs(x - snakeHead.x),
    this.distanceY= Math.abs(y - snakeHead.y),
    this.score = this.distanceX + this.distanceY;
}
function Snake(body) {
    this.head = body[0],
    this.neck = body[1],
    this.body = body,
    this.direction = '',
    this.oppositeDirection = '';
}
function Node(x,y,target, origin, snakeHead) {
    this.x= x,
    this.y= y,
    this.distanceTo= Math.abs(x - target.x) + Math.abs(y - target.y),
    this.distanceFrom= Math.abs(x - origin.x) + Math.abs(y - origin.y),
    this.orgin = origin; 
}

//HELPER FUNCTIONS
//Get current direction and store invalid opposite direction
function getDirections (snake){
    
    //check for start
    if ( snake.head.x === snake.neck.x && snake.head.y === snake.neck.y){
        return ;
    }
    
    if (snake.head.x === snake.neck.x){
        if(snake.head.y > snake.neck.y){
            snake.direction = 'down';
            snake.oppositeDirection = 'up';
        }else{
            snake.direction = 'up';
            snake.oppositeDirection = 'down';
        }
    }
    if (snake.head.y === snake.neck.y){
        if( snake.head.x > snake.neck.x){
            snake.directions = 'right';
            snake.oppositeDirection = 'left';
        }else{
            snake.direction = 'left';
            snake.oppositeDirection = 'right';
        }
    }
}

function checkBoundaries(head, board, movesArr){
    const width = board.width;
    const height = board.height;
    let walls = [0,0]; // [X-axis, Y-axis]
    
    //X-axis
    if(head.x === 0){
        walls[0] = 'left';
    }else if(head.x == width -1){
        walls[0] = 'right';
    }
    
    //Y-axis
    if (head.y === 0){
        walls[1] = 'up';
    }else if (head.y === height -1  ){
        walls[1] = 'down';
    }
     //if there is a wall, remove it from moves
    if(walls[0] != 0 || walls[1] != 0){
        //check if direction has been already removed, if not remove it
        removeArrayOfMoves(walls, movesArr);
    }
//    console.log('Invalid moves due to walls: ' + walls);
    
}

function snakeCollision(snake, movesArray){
        
    const snakeBody = snake.body;
    let invalidMoves = [];  

    snakeBody.forEach(function(element){
        if (snake.head.x + 1 === element.x && snake.head.y === element.y){
            invalidMoves.push('right');
        }
        if (snake.head.x -1 == element.x && snake.head.y === element.y){
            invalidMoves.push('left');   
        }
        if (snake.head.y + 1 == element.y && snake.head.x === element.x){
            invalidMoves.push('down');
        }
        if (snake.head.y -1 == element.y && snake.head.x === element.x){
            invalidMoves.push('up');
        }
    });
//    console.log('Invalid moves due to body: ' + invalidMoves);

    removeArrayOfMoves(invalidMoves, movesArray);
}
function removeSingleMove(invalidMove, movesArr){
    if(movesArr.indexOf(invalidMove) != -1){
        const index = movesArr.indexOf(invalidMove);
        movesArr.splice(index, 1);
    }
}
function removeArrayOfMoves(invalidArr, movesArr){
     invalidArr.forEach(function(element){
        if(movesArr.indexOf(element) != -1){
            const index = movesArr.indexOf(element);
            movesArr.splice(index, 1);
        }
     });
}

function findClosestFood(snake, board){
    let foodArr = [];

    board.food.forEach(function(element){
        let food = new Food(element.x, element.y, snake.head);
        foodArr.push(food);
    });

    foodArr.sort(function(a,b){
        return a.score - b.score;
    });
    
    return foodArr;
}

//END OF HELPERS
//STATE FUNCTIONS
  function basicSurvival(snake, board, movesArr){
      
    getDirections(snake);
    
    removeSingleMove(snake.oppositeDirection, movesArr);

    //check for boundary
    checkBoundaries(snake.head, board, movesArr);

    //check for own body;
    snakeCollision(snake, movesArr);

}

function getClosestFood(closestFoodArr, snake){
        
        if (closestFoodArr.length !=0){
            const food = closestFoodArr[0];
            let preferredMove = snake.direction;
//            console.log(food);
            
            if (food.distanceX + food.distanceY != 0){
                if (food.distanceX >= food.distanceY){
                    if (food.x > snake.head.x){
                        preferredMove = 'right';
                    }else if (food.x < snake.head.x){
                        preferredMove = 'left';
                    }
                }else if (food.distanceY >= food.distanceX){
//                    console.log('Y is greater than X');
                    if (food.y > snake.head.y){
                        preferredMove = 'down';
                    }else if (food.y < snake.head.y){
                        preferredMove = 'up';
                    }
                }
                console.log( 'Preferred Move: ' + preferredMove);
                return preferredMove;
            }
        }
    }

function getPath(closestFoodArr, snake, board){
//    console.log('Get PAth!');
    //if there is food
    if(closestFoodArr.length != 0 ){
        const target = closestFoodArr[0];
        let preferredMove = snake.direction;
        let node = new Node(snake.head.x, snake.head.y, target, snake.head);
        
        function createSurroundingNodes(node, board){
            //create surrounding nodes
            let additionalNodes = [];
            //Left
            additionalNodes.push(new Node(node.x-1, node.y, target, node));
            //Top
            additionalNodes.push(new Node(node.x, node.y-1, target, node));
            //Right
            additionalNodes.push(new Node(node.x+1, node.y, target, node));
            //Bottom
            additionalNodes.push(new Node(node.x, node.y+1, target, node));
            
            let flag = false;
            for( let i = 0; i <= (additionalNodes.length - 1) ; i++){
                //if out of bounds
                if(additionalNodes[i].x < 0 || additionalNodes[i].y < 0 || additionalNodes[i].x > (board.width - 1) || additionalNodes[i].y > (board.height -1)){
                    flag = true;
                }
                //if node is par of a snake
                board.snakes.forEach(function(snakeElement){
                    snakeElement.body.forEach(function(bodyElement){
                        if (bodyElement.x == additionalNodes[i].x && bodyElement.y == additionalNodes[i].y){
                            flag = true;
                        }
                    });
                });
                //removed if flagged as invalid
                if (flag){
                    additionalNodes.splice(i,1);
                    i--;
                    flag = false;
                }
            }
            return additionalNodes;
        }
        
        //create surrounding nodes
        let newNodes = createSurroundingNodes(node, board);
        let nodesArray = [node];
        nodesArray = nodesArray.concat(newNodes);
        //sort nodes by score
        nodesArray.sort(function(a,b){
            return a.distanceTo - b.distanceTo;
        })
        while(nodesArray[0].distanceTo != 0){
           newNodes =  createSurroundingNodes(nodesArray[0], board);
           nodesArray = nodesArray.concat(newNodes);
            //sort nodes by score
            nodesArray.sort(function(a,b){
                return a.score - b.score;
            })
//            console.log(nodesArray[0]);
        }
        console.log(nodesArray);

    }
}


// Handle POST request to '/start'
app.post('/start', (request, response) => {
  // NOTE: Do something here to start the game

  // Response data
  const data = {
    color: '#DFFF00',
  }

  return response.json(data)
})


// Handle POST request to '/move'
app.post('/move', (request, response) => {
  // NOTE: Do something here to generate your move
    let moves = ['left', 'up', 'right', 'down'];
    
    //todo changed from body to Me using object
    let MySnake = new Snake(request.body.you.body);
    const Board = request.body.board;
    
    console.log(request.body.turn);
    
    console.log( 'Snake - X: '+MySnake.head.x+' Y: ' +MySnake.head.y);                      
    //set direction, account for walls and body
    basicSurvival(MySnake, Board, moves);
    let suggestedMove = MySnake.direction;

    
//    if(request.body.you.health < 30){
        let closestFoodArr = findClosestFood(MySnake, Board);
        console.log('Closest Food: ');
        console.log( closestFoodArr[0]);
//         suggestedMove = getClosestFood(closestFoodArr, MySnake);
        getPath(closestFoodArr, MySnake, Board);
//    }
    
    //override with suggest move is it is still available
    console.log('Direction: ' + MySnake.direction);
    if(moves.indexOf(suggestedMove) != -1){
            console.log('defaulted to suggest move: ' + suggestedMove);
            moves = [suggestedMove];
        }
    
    console.log('Move:' + moves);
    
  // Response data
    const data = {
        move: moves[0], // one of: ['up','down','left','right']
    }

  return response.json(data)
})

app.post('/end', (request, response) => {
  // NOTE: Any cleanup when a game is complete.
  return response.json({})
})

app.post('/ping', (request, response) => {
  // Used for checking if this snake is still alive.
  return response.json({});
})

// --- SNAKE LOGIC GOES ABOVE THIS LINE ---

app.use('*', fallbackHandler)
app.use(notFoundHandler)
app.use(genericErrorHandler)

app.listen(app.get('port'), () => {
  console.log('Server listening on port %s', app.get('port'))
})