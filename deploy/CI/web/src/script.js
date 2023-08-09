import short from "shortid";
import * as THREE from "three";
import { MathUtils } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { throttle } from "throttle-debounce";
import "./style.css";

MathUtils.seededRandom(Date.now);

const traceRateInMillis = 1;

const logTrace = throttle(5000, false, console.log);

let playerName = localStorage.getItem("yourName") || "Default";let otherPlayers = {};
let otherPlayersMeshes = {};
let sendYourPosition;

if (!localStorage.getItem("yourId")) {
  localStorage.setItem("yourId", short());
}
const yourId = localStorage.getItem("yourId");

let renderer, scene, camera, sun, water;
let canvas;
let player, controls;
let waternormals;

let turtleModel, boxModel;

let gameOverFlag = false;
let sounds;
let speedElement;

let scoreFromBackend;
let localScore = 0;
let timerId;
let gameDuration;
let worker;
let remainingTime;

let keyboard = {};


const startButton = document.getElementById("startButton");
startButton.addEventListener("click", init);

async function init() {
  const overlay = document.getElementById("overlay");
  overlay.remove();


  // Create an array to store the objects in the scene
  const objects = [];

  // Setup the scene
  var scene = new THREE.Scene();

  const loader = new GLTFLoader();
  const textureLoader = new THREE.TextureLoader();

  const waternormals = await textureLoader.loadAsync( 'assets/waternormals.jpg');
  waternormals.wrapS = waternormals.wrapT = THREE.RepeatWrapping;

  // Load the GLTF model
  const boatGltf = await loader.loadAsync("assets/boat.gltf");
  const boatModel = boatGltf.scene.children[0];
  
  const turtleGltf = await loader.loadAsync("assets/turtle.gltf");
  const turtleModel = turtleGltf.scene.children[0];
  
  const boxGltf = await loader.loadAsync("assets/box.gltf");
  const boxModel = boxGltf.scene.children[0];
  
  var camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Add fog to the scene
  scene.fog = new THREE.FogExp2(0xffffff, 0.01);

  // Add event listener to resize renderer when the window is resized
  window.addEventListener("resize", function () {
    var width = window.innerWidth;
    var height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });


  // Comms
  const hostname = window.location.hostname;
  const isDevelopment = hostname === "localhost";
  const wsURL = isDevelopment ? "ws://localhost:3000" : "ws://";

  const worker = new Worker(new URL("./commsWorker.js", import.meta.url));
  worker.postMessage({ type: "start", body: wsURL });

  worker.onmessage = ({ data }) => {
    const { type, body, error } = data;
    if (error) {
      console.error(error);
      Object.keys(otherPlayersMeshes).forEach((id) => {
        scene.remove(otherPlayersMeshes[id]);
        delete otherPlayersMeshes[id];
      });
      Object.keys(otherPlayers).forEach((id) => delete otherPlayers[id]);
    }
    switch (type) {
      case "connect":
        console.log("Web Socket connection");
        break;
      case "disconnect":
        console.log("Web Socket disconnection");
        break;
      case "log":
        console.log(body);
        break;
      case "items":
        console.log(body);
        break;
      case "allPlayers":
        delete body[yourId];
        for (const [key, value] of Object.entries(body)) {
          otherPlayers[key] = value;
        }
        break;
      case "player.new":
        const { id, name } = body;
        if (id !== yourId) {
          console.log(`New Player ${name} (${id})`);
          otherPlayersMeshes[id] = makePlayerMesh(playerModel, scene, name);
        }
        break;
      case "player.delete":
        console.log(`Delete Player ${body}`);
        if (body !== yourId) {
          scene.remove(otherPlayersMeshes[body]);
          delete otherPlayersMeshes[body];
          delete otherPlayers[body];
        }
        break;
      default:
        break;
    }
  };

  // Send Player trace
  sendYourPosition = throttle(traceRateInMillis, false, () => {
    const { x, y } = player.position;
    const { z: rotZ } = player.rotation;
    const trace = {
      id: yourId,
      name: playerName,
      x: x.toFixed(5),
      y: y.toFixed(5),
      rotZ: rotZ.toFixed(5), // add rotation Z value
      score,
    };
    worker.postMessage({ type: "player.trace", body: trace });
  });

// water
const waterGeometry = new THREE.PlaneGeometry( 10000, 10000 );
water = new Water(
  waterGeometry,
  {
    textureWidth: 512,
    textureHeight: 512,
    // waterNormals: new THREE.TextureLoader().load( 'assets/waternormals.jpg', function ( texture ) {

    //   texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

    // } ),
    waterNormals: waternormals,
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 0.05,
    fog: scene.fog !== undefined
  }
);
water.rotation.x = - Math.PI / 2;

scene.add(water);
scene.add(boat);
player = boat;

  // Skybox

const sky = new Sky();
sky.scale.setScalar( 10000 );
scene.add( sky );

const skyUniforms = sky.material.uniforms;

skyUniforms[ 'turbidity' ].value = 10;
skyUniforms[ 'rayleigh' ].value = 2;
skyUniforms[ 'mieCoefficient' ].value = 0.005;
skyUniforms[ 'mieDirectionalG' ].value = 0.8;

const parameters = {
  elevation: 5,
  azimuth: 162
};
console.log("sky", sky);
  const pmremGenerator = new THREE.PMREMGenerator( renderer );
  sun = new THREE.Vector3(0,0,0);
  function updateSun() {

    const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
    const theta = THREE.MathUtils.degToRad( parameters.azimuth );
  
    sun.setFromSphericalCoords( 1, phi, theta );
  
    sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
    water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();
  
    scene.environment = pmremGenerator.fromScene( sky ).texture;
  
  }

  const navmeshGeometry = new THREE.PlaneGeometry(160, 255);
  const navmeshMaterial = new THREE.MeshBasicMaterial({
  color: 0x0000ff, 
  opacity: 0,
  transparent: true,
  wireframe: false,
  });
  const navmesh = new THREE.Mesh(navmeshGeometry, navmeshMaterial);
  
  water.addEventListener("change", () => {
  navmesh.geometry = water.geometry.clone();
  navmesh.position.copy(water.position);
  });
  
  // Add the navmesh to the scene
  navmeshGeometry.rotateX(Math.PI / 2);
  scene.add(navmesh);



  // // Load the GLTF model
  // loader.load(
  //   "assets/turtle.gltf", // URL of the model
  //   function (gltf) {
  //     const turtle = gltf.scene.children[0];

  //     // Call turtleGen function to get the turtle's position
  //     const { x, y, z } = turtleGen();
  //     turtle.position.set(x, y, z);

  //     // Set the turtle's scale and rotation
  //     turtle.scale.set(1, 1, 1);
  //     turtle.rotation.set(0, 0, 0);

  //     // Add the turtle to the scene
  //     scene.add(turtle);
  //     turtle.type = "wildlife";
  //     objects.push(turtle);
  //   },
  //   undefined, // onProgress callback function
  //   function (error) {
  //     console.error(error);
  //   }
  // );

  function makePlayerMesh(playerMesh, scene) {
    const group = new THREE.Group();
    
    // Clone the player's mesh
    const mesh = playerMesh.clone();
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    
    // Traverse the new mesh and set the shadow properties
    mesh.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
    });
    
    //TODO add names 
    // // Add the mesh and label to the group
    group.add(mesh);
    // // group.add(nameLabel);
    
    // // Add the group to the scene
    scene.add(group);
    
    return group;
    }

  // Save the player's name and score to a local JSON file
  const playerData = {
    id: yourId,
    name: playerName,
    score: score,
    date: new Date(),
  };
  const leaderboard = JSON.parse(localStorage.getItem("leaderboard") || "[]");
  leaderboard.push(playerData);
  localStorage.setItem("leaderboard", JSON.stringify(leaderboard));

  // Create a variable to keep track of the player's score
  var score = 0;

  // Display the player's score on the screen
  var scoreElement = document.createElement("div");
  scoreElement.style.position = "absolute";
  scoreElement.style.top = "10px";
  scoreElement.style.left = "10px";
  scoreElement.style.color = "white";
  scoreElement.style.fontSize = "24px";
  scoreElement.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  scoreElement.innerHTML = "Score: " + score;
  document.body.appendChild(scoreElement);

  const materials = [
    new THREE.MeshPhongMaterial({ color: 0x00ff00 }), // Green material for wildlife
    new THREE.MeshPhongMaterial({ color: 0xff0000 }), // Red material for trash
  ];

  const geometries = [
    new THREE.SphereGeometry(),
    new THREE.BoxGeometry(),
    new THREE.BufferGeometry(),
  ];

  // Create a random trash or wildlife object
  function createRandomObject() {

    const isWildlife = Math.random() < 0.5; // 50% chance of being wildlife
    const geometry = isWildlife ? geometries[0] : geometries[1]; // Use sphere geometry for wildlife, cube geometry for trash
    const material = isWildlife ? materials[0] : materials[1];
    const object = new THREE.Mesh(geometry, material);
    object.position.set(
      Math.random() * 88 - 44, // set random position within the plane width
      Math.random() * 22 - 11, // set random position within the plane height
      0
    );
    const scale = Math.random() * 1; // Random scale value between 1 and 15
    object.scale.set(scale, scale, scale);
    object.type = isWildlife ? "wildlife" : "trash";
    object.outOfBounds = false;

    // check if object is within the bounds of the plane
    const waterBoundaries = waterGeometry.parameters;
    const objectBoundaries = new THREE.Box3().setFromObject(object);
    if (
      objectBoundaries.min.x > waterBoundaries.width / 2 ||
      objectBoundaries.max.x < -waterBoundaries.width / 2 ||
      objectBoundaries.min.y > waterBoundaries.height / 2 ||
      objectBoundaries.max.y < -waterBoundaries.height / 2
    ) {
      // if the object is outside the plane, mark it as out of bounds and return
      object.outOfBounds = true;
      return;
    }

    scene.add(object);
    objects.push(object);
  }

  const floatAmplitude = 0.1;

  function animateObjects() {
    const time = performance.now() * 0.001; // Get current time in seconds
    objects.forEach((object) => {
      if (!object.outOfBounds) {
        const sinValue = Math.sin(
          time * 2 + object.position.x * 0.5 + object.position.y * 0.3
        );
        object.position.z = sinValue * floatAmplitude;
      }
    });
  }

  // Check for collisions between the player and each object in the scene

  function createObject() {
    createRandomObject();
    const timeInterval = Math.floor(Math.random() * 9000) + 1000; // Random time interval between 1 and 10 seconds
    setTimeout(createObject, timeInterval);
  }

  // Call createObject to start creating objects
  createObject();


  document.addEventListener("keydown", function (event) {
    keyboard[event.code] = true;
    });
    document.addEventListener("keyup", function (event) {
    keyboard[event.code] = false;
    });

  let playerSpeed = 0;

  const navmeshBoundingBox = new THREE.Box3().setFromObject(navmesh);

  function checkCollisions() {
    const playerBox = new THREE.Box3().setFromObject(player);
    for (const [key, mesh] of Object.entries(itemMeshes)) {
    if (mesh.outOfBounds) {
      continue;
    }
    const itemMeshBox = new THREE.Box3().setFromObject(mesh);
    // FIXME use cannon.js or any physics engine
    const collision = playerBox.intersectsBox(itemMeshBox);
    if (collision) {
    
                // Play all animations and set the count of playing animations
                if (mesh.animationActions) {
                  mesh.playingAnimationsCount = mesh.animationActions.length;
                  mesh.animationActions.forEach((action) => action.play());
              }
    
    
      // Remove the object from the scene and the itemMeshes
      const collisionData = {
        itemId: key,
        localScore,
        playerId: yourId,
        playerName: playerName,
      };
      worker.postMessage({
        type: "items.collision",
        body: collisionData,
      });
      scene.remove(mesh);
      isMarineLife(mesh.itemType) ? localScore-- : localScore++;
      scoreElement.innerHTML = "Score: " + localScore;
      delete itemMeshes[key];
    }
    }
    }
    
let speedLimitation = performance.now();

function updatePlayerPosition() {
if (!player || !water || gameOverFlag) {
return;
}
const ACCELERATION = 1;
const BRAKE = 0.0005;
const MAX_SPEED = 0.05;
const FRICTION = 0.003;
const TURN_SPEED = Math.PI / 360;
const DRIFT_FACTOR = 0.02

let currentTime = performance.now();
let movement = new THREE.Vector3(0, 0, 0);
let lateralVelocity = new THREE.Vector3(0,0,0);
let deltaTime = (currentTime - speedLimitation)/10000;

speedLimitation = currentTime;

// console.log("Speed Limitation: ", speedLimitation);
// console.log("Current time: ", currentTime);
// console.log("Delta time: ", deltaTime);

if (keyboard["ArrowUp"]) {
playerSpeed += ACCELERATION * deltaTime;
} else if (keyboard["ArrowDown"]) {
playerSpeed -= BRAKE;
}

if (keyboard["ArrowLeft"]) {
player.rotation.y += TURN_SPEED;
if (keyboard["ArrowUp"]) {
    playerSpeed *= (1 - FRICTION);
    lateralVelocity.y += DRIFT_FACTOR;
}
}
if (keyboard["ArrowRight"]) {
player.rotation.y -= TURN_SPEED;
if (keyboard["ArrowUp"]) {
    playerSpeed *= (1 - FRICTION); 
    lateralVelocity.y -= DRIFT_FACTOR;
}
}

if (!keyboard["ArrowUp"] && !keyboard["ArrowDown"]) {
playerSpeed *= (1 - FRICTION)
}

player.position.x += lateralVelocity.x;
lateralVelocity.x *=(1-FRICTION);

playerSpeed = Math.max(Math.min(playerSpeed, MAX_SPEED), -MAX_SPEED);
speedElement.innerHTML = `Speed: ${playerSpeed.toFixed(2)*100}`;

const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(
player.quaternion
);


const CAMERA_DISTANCE = 2;
const CAMERA_HEIGHT = 0.5;
const SPRING_STRENGTH = 0.1;

movement.copy(direction).multiplyScalar(playerSpeed);
const lastPosition = player.position.clone();
player.position.add(movement);

const playerBoundingBox = new THREE.Box3().setFromObject(player);
if (!playerBoundingBox.intersectsBox(navmeshBoundingBox)) {player.position.copy(lastPosition);}


const targetCameraPosition = new THREE.Vector3();
const sphericalCoords = new THREE.Spherical(CAMERA_DISTANCE, Math.PI / 2, player.rotation.y + Math.PI);
targetCameraPosition.setFromSpherical(sphericalCoords);
targetCameraPosition.y += CAMERA_HEIGHT;
targetCameraPosition.add(player.position);
camera.position.lerp(targetCameraPosition, SPRING_STRENGTH);
camera.lookAt(player.position);
}


//player meshes id
function animateOtherPlayers(playerMeshes) {
  if (!playerMeshes) return;
  Object.keys(playerMeshes).forEach((id) => {
  if (otherPlayers[id]) {
    playerMeshes[id].position.x = otherPlayers[id].x;
    playerMeshes[id].position.z = otherPlayers[id].z;
    playerMeshes[id].rotation.y = otherPlayers[id].rotY;
  }
  });
  }

  function animate() {
    // requestAnimationFrame(animate);
    updatePlayerPosition();
    checkCollisions();
    render();
    updateSun();
    animateItems();
    // traces
    sendYourPosition();
    // logTrace(
    //   `Player on (${player.position.x.toFixed(2)}, ${player.position.z.toFixed(
    //     2, 
    //   )}) heading to ${player.rotation.y.toFixed(2)}`
    // );
    animateOtherPlayers(otherPlayersMeshes);
    }
    animate();

    function render() {

      water.material.uniforms[ 'time' ].value += 1.0 / 2330.0;
      
      renderer.render( scene, camera );
      
      }
}
