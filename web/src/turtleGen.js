export function turtleGen() {
    // Generate random coordinates for the turtle
    // const x = Math.random() * 10 - 5; // range from -5 to 5
    // const y = 0; // set y coordinate to 0
    // const z = Math.random() * 10 - 5; // range from -5 to 5

    const x = 5; // range from -5 to 5
    const y = 5; // set y coordinate to 0
    const z = Math.random() * 10 - 5; // range from -5 to 5
  
    // Return the turtle's position as an object
    return { x, y, z };
  }
  