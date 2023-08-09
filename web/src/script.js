import short from "shortid";
import * as THREE from "three";
import { MathUtils } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { throttle } from "throttle-debounce";
import "./style.css";
import * as lobby from "./lobby";

MathUtils.seededRandom(Date.now);

const traceRateInMillis = 50;

const logTrace = throttle(1000, false, console.log);

let otherPlayers = {};
let otherPlayersMeshes = {};
let items = {};
let itemMeshes = {};
let sendYourPosition;

// Default
let boundaries = { width: 89, height: 23 };

if (!localStorage.getItem("yourId")) {
  localStorage.setItem("yourId", short());
}
const yourId = localStorage.getItem("yourId");
let playerName = localStorage.getItem("yourName") || "Default";

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
let serverVersion;
let worker;
let remainingTime;

let keyboard = {};

lobby.getLeaderBoard();

const createGameButton = document.getElementById("create-game-button");
createGameButton.addEventListener("click", init);

async function init() {
  scene = new THREE.Scene();

  function fibonacciGenerator(maxTerm) {
    let sequence = [0, 1];

    while (sequence.length <= maxTerm) {
      sequence.push(
        sequence[sequence.length - 1] + sequence[sequence.length - 2]
      );
    }

    return sequence;
  }

  function getFibonacciNumber(term) {
    const fibonacciSequence = fibonacciGenerator(term);
    return fibonacciSequence[term - 1];
  }

  console.log(getFibonacciNumber(60));

  const listener = new THREE.AudioListener();

  // //TODO class for boats

  // class Boat {
  //   constructor(){
  //     loader.load("assets/boat3.gltf", (gltf) => {
  //       scene.add( gltf.boat )
  //       boat.scene.scale.set(30, 30, 30)
  //       gltf.scene.position.set(0,0,0)
  //       gltf.scene.rotation.y = 1.5

  //       boat.position.set(0, 0, 0);
  //       boat.scale.set(1, 1, 1);
  //       boat.rotation.set(0, 0, 0);
  //       boat.castShadow = true;
  //       boat.receiveShadow = true;

  //       this.boat = gltf.scene
  //       this.speed = {
  //         vel: 0,
  //         rot: 0
  //       }

  //     })
  //   }
  // }

  // Load the GLTF models

  const loader = new GLTFLoader();
  const textureLoader = new THREE.TextureLoader();

  const boatGltf = await loader.loadAsync("assets/boat.gltf");
  const boatModel = boatGltf.scene.children[0];

  const turtleGltf = await loader.loadAsync("assets/turtle.gltf");
  const turtleModel = turtleGltf.scene.children[0];

  const boxGltf = await loader.loadAsync("assets/box.gltf");
  const boxModel = boxGltf.scene.children[0];

  const waternormals = await textureLoader.loadAsync("assets/waternormals.jpg");
  waternormals.wrapS = waternormals.wrapT = THREE.RepeatWrapping;
  // console.log("init: ",waternormals);

  const geometries = [
    new THREE.BoxGeometry(), // Cube geometry for wildlife
    boxModel.geometry, // Box GLTF for trash
  ];

  const materials = [
    new THREE.MeshPhongMaterial({ color: 0x000000 }), // Green material for wildlife
    new THREE.MeshPhongMaterial({ color: 0x654321 }), // material for trash
  ];

  //add music loader
  const audioLoader = new THREE.AudioLoader();
  const sounds = await audioLoader.loadAsync(
    "assets/mixkit-motorboat-on-the-sea-1183.m4v"
  );

  // Comms
  const hostname = window.location.hostname;
  const isDevelopment = hostname === "localhost";
  const wsURL = isDevelopment ? "ws://localhost:3000" : "ws://";

  worker = new Worker(new URL("./commsWorker.js", import.meta.url));
  worker.postMessage({
    type: "init",
    body: { wsURL, yourId, yourName: playerName },
  });

  worker.onmessage = ({ data }) => {
    const { type, body, error } = data;
    if (error) {
      // console.error(error);
      Object.keys(otherPlayersMeshes).forEach((id) =>
        scene.remove(otherPlayersMeshes[id])
      );
      otherPlayers = {};
      otherPlayersMeshes = {};
    }
    switch (type) {
      case "connect":
        // console.log("Web Socket connection");
        break;
      case "disconnect":
        // console.log("Web Socket disconnection");
        break;
      case "log":
        console.log(body);
        break;
      case "server.info":
        // console.log(`Connected to server ${body.id}`);
        // console.log(`Game duration ${body.gameDuration} seconds`);
        serverVersion = body.version;
        gameDuration = body.gameDuration;
        // console.log(`World X: ${body.worldSizeX} World Z: ${body.worldSizeZ}`);
        boundaries.width = body.worldSizeX;
        boundaries.height = body.worldSizeZ;
        // console.log(`Updated boundaries: width: ${boundaries.width}, height: ${boundaries.height}`);
        break;
      case "game.on":
        worker.postMessage({
          type: "game.start",
          body: { playerId: yourId, playerName },
        });
        startGame(
          gameDuration,
          [boatModel, turtleModel, boxModel],
          sounds,
          waternormals
        );
        break;
      case "game.end":
        endGame();
        break;
      case "items.all":
        Object.keys(body).forEach((key) => {
          if (!items[key]) {
            createItemMesh(
              key,
              body[key].type,
              body[key].position,
              body[key].size
            );
          }
          items[key] = body[key];
        });
        break;
      case "item.new":
        const { id: itemIdToCreate, data: itemData } = body;
        createItemMesh(
          itemIdToCreate,
          itemData.type,
          itemData.position,
          itemData.size
        );
        items[itemIdToCreate] = itemData;
        break;
      case "item.destroy":
        const itemIdToDestroy = body;
        const item = items[itemIdToDestroy];
        const mesh = itemMeshes[itemIdToDestroy];
        if (item && mesh) {
          scene.remove(mesh);
          delete items[itemIdToDestroy];
          delete itemMeshes[itemIdToDestroy];
        }
        break;
      case "player.trace.all":
        for (const [key, traceData] of Object.entries(body)) {
          otherPlayers[key] = traceData;
          if (!otherPlayersMeshes[key]) {
            otherPlayersMeshes[key] = makePlayerMesh(boatModel, scene);
          }
        }
        break;
      case "player.info.joined":
        const { id: joinedId, name: joinedName } = body;
        if (joinedId !== yourId) {
          otherPlayersMeshes[joinedId] = makePlayerMesh(boatModel, scene);
        }
        break;
      case "player.info.left":
        const playerId = body;
        if (playerId !== yourId) {
          scene.remove(otherPlayersMeshes[playerId]);
          delete otherPlayersMeshes[playerId];
          delete otherPlayers[playerId];
        }
        break;
      case "player.info.all":
        // FIXME update player info
        // console.log("player.info.all", body);
        // otherPlayers
        break;
      default:
        break;
    }
  };

  // FIXME Disconnect properly when kill tab, reload, etc
  window.addEventListener("beforeunload", function (e) {
    // console.log("beforeunload");
  });

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

  // Create a random trash or wildlife object
  function createItemMesh(itemId, itemType, position, size) {
    // Using marine life models when isMarineLife() returns true
    const geometry = isMarineLife(itemType) ? geometries[0] : geometries[1];
    const material = isMarineLife(itemType) ? materials[0] : materials[1];
    const itemMesh = new THREE.Mesh(geometry, material);
    itemMesh.position.set(position.x, position.y, position.z);

    if (!isMarineLife(itemType)) {
      // If it's a trash item
      itemMesh.animationActions = itemMesh.animations.map((animation) => {
        const action = itemMesh.mixer.clipAction(animation);

        action.addEventListener("finished", function () {
          // Decrease the count of playing animations
          itemMesh.playingAnimationsCount--;

          // If all animations have finished playing, remove the mesh from the scene
          if (itemMesh.playingAnimationsCount === 0) {
            scene.remove(mesh);
            delete itemMeshes[itemId];
          }
        });

        return action;
      });
    }

    console.log(position);
    itemMesh.scale.set(size, size, size);
    itemMesh.itemId = itemId;
    itemMesh.itemType = itemType;
    itemMesh.isTrash = !isMarineLife(itemType); // Set the isTrash flag to the itemMesh
    itemMesh.outOfBounds = false;

    // check if object is within the bounds of the plane
    const objectBoundaries = new THREE.Box3().setFromObject(itemMesh);
    if (
      objectBoundaries.min.x > boundaries.width / 2 ||
      objectBoundaries.max.x < -boundaries.width / 2 ||
      objectBoundaries.min.z > boundaries.height / 2 ||
      objectBoundaries.max.z < -boundaries.height / 2
    ) {
      // if the object is outside the plane, mark it as out of bounds and return
      itemMesh.outOfBounds = true;
      return;
    }

    scene.add(itemMesh);
    itemMeshes[itemId] = itemMesh;
    return itemMesh;
  }

  const overlay = document.getElementById("overlay");
  overlay.remove();
}

// FIXME models passed as array?
function startGame(gameDuration, [boat, turtle], sounds, waternormals) {
  console.log("StartGame: ", waternormals);

  //renders
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  renderer.toneMappingExposure = 0.55;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  document.body.appendChild(renderer.domElement);

  sun = new THREE.Vector3();

  //boat spawn

  var camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  scene.add(boat);
  player = boat;

  //scene lights
  const ambientLight = new THREE.AmbientLight(0x404040, 13);
  player.add(ambientLight);

  //background music
  const listener = new THREE.AudioListener();
  camera.add(listener);

  const sound = new THREE.Audio(listener);
  sound.setBuffer(sounds);
  sound.setVolume(0.09);
  sound.play();
  sound.setLoop(true);

  window.addEventListener("resize", function () {
    var width = window.innerWidth;
    var height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });

  scene.add(camera);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 10, 0);
  controls.minDistance = 4.0;
  controls.maxDistance = 200.0;
  controls.update();

  // water
  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
  water = new Water(waterGeometry, {
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
    fog: scene.fog !== undefined,
  });
  water.rotation.x = -Math.PI / 2;

  scene.add(water);

  // Skybox

  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;

  skyUniforms["turbidity"].value = 10;
  skyUniforms["rayleigh"].value = 2;
  skyUniforms["mieCoefficient"].value = 0.005;
  skyUniforms["mieDirectionalG"].value = 0.8;

  const parameters = {
    elevation: 5,
    azimuth: 162,
  };
  console.log("sky", sky);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);

  sun = new THREE.Vector3(0, 0, 0);

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms["sunPosition"].value.copy(sun);
    water.material.uniforms["sunDirection"].value.copy(sun).normalize();

    scene.environment = pmremGenerator.fromScene(sky).texture;
  }
  // console.log("sun ", sun);

  sendYourPosition = throttle(traceRateInMillis, false, () => {
    if (gameOverFlag) return;
    // FIXME don't send trace if no changes
    const { x, y, z } = player.position;
    const { x: rotX, y: rotY, z: rotZ } = player.rotation;
    const trace = {
      id: yourId,
      x: x.toFixed(10),
      z: z.toFixed(10),
      rotY: rotY.toFixed(10),
    };
    worker.postMessage({ type: "player.trace.change", body: trace });
  });

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

  // Create a variable to store the remaining time
  remainingTime = gameDuration;
  var timerDiv = document.createElement("div");
  timerDiv.style.position = "absolute";
  timerDiv.style.top = "45px";
  timerDiv.style.left = "10px";
  timerDiv.style.color = "white";
  timerDiv.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  timerDiv.innerHTML = "Time: " + remainingTime;
  document.body.appendChild(timerDiv);

  var versionsDiv = document.createElement("div");
  versionsDiv.style.position = "absolute";
  versionsDiv.style.bottom = "10px";
  versionsDiv.style.right = "10px";
  versionsDiv.style.color = "white";
  versionsDiv.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  versionsDiv.innerHTML = "Server: " + serverVersion;
  document.body.appendChild(versionsDiv);

  speedElement = document.createElement("div");
  speedElement.style.position = "absolute";
  speedElement.style.top = "65px";
  speedElement.style.left = "10px";
  speedElement.style.color = "white";
  speedElement.style.fontSize = "13px";
  speedElement.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  speedElement.innerHTML = "Speed: ";
  document.body.appendChild(speedElement);

  function updateTimer() {
    if (remainingTime > 0) {
      remainingTime--;
    }
    timerDiv.innerHTML = "Time: " + remainingTime;
    setTimeout(updateTimer, 1000);
  }

  // Start the timer
  updateTimer();

  function restart() {
    restartBtn.style.display = "none";

    for (const [key, mesh] of Object.entries(itemMeshes)) {
      scene.remove(mesh);
    }

    player.position.set(0, 0, 0);
    localScore = 0;

    scoreElement.innerHTML = "Score: " + localScore;

    remainingTime = remainingTime;
    timerDiv.innerHTML = "Time: " + remainingTime;

    updateTimer();
  }

  startTimer();

  var scoreElement = document.createElement("div");
  scoreElement.style.position = "absolute";
  scoreElement.style.top = "10px";
  scoreElement.style.left = "10px";
  scoreElement.style.color = "white";
  scoreElement.style.fontSize = "24px";
  scoreElement.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  scoreElement.innerHTML = "Score: " + localScore;
  document.body.appendChild(scoreElement);

  const floatAmplitude = 0.1;
  const time = performance.now() * 0.0001;

  function animateItems() {
    for (const [key, mesh] of Object.entries(itemMeshes)) {
      if (!mesh.outOfBounds) {
        const sinValue = Math.sin(
          time * 2 + mesh.position.x * 0.5 + mesh.position.z * 0.3
        );
        mesh.position.y = sinValue * floatAmplitude;
      }
    }
  }

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
    const DRIFT_FACTOR = 0.02;

    let currentTime = performance.now();
    let movement = new THREE.Vector3(0, 0, 0);
    let lateralVelocity = new THREE.Vector3(0, 0, 0);
    let deltaTime = (currentTime - speedLimitation) / 10000;

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
        playerSpeed *= 1 - FRICTION;
        lateralVelocity.y += DRIFT_FACTOR;
      }
    }
    if (keyboard["ArrowRight"]) {
      player.rotation.y -= TURN_SPEED;
      if (keyboard["ArrowUp"]) {
        playerSpeed *= 1 - FRICTION;
        lateralVelocity.y -= DRIFT_FACTOR;
      }
    }

    if (!keyboard["ArrowUp"] && !keyboard["ArrowDown"]) {
      playerSpeed *= 1 - FRICTION;
    }

    player.position.x += lateralVelocity.x;
    lateralVelocity.x *= 1 - FRICTION;

    playerSpeed = Math.max(Math.min(playerSpeed, MAX_SPEED), -MAX_SPEED);
    speedElement.innerHTML = `Speed: ${playerSpeed.toFixed(2) * 100}`;

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
    if (!playerBoundingBox.intersectsBox(navmeshBoundingBox)) {
      player.position.copy(lastPosition);
    }

    const targetCameraPosition = new THREE.Vector3();
    const sphericalCoords = new THREE.Spherical(
      CAMERA_DISTANCE,
      Math.PI / 2,
      player.rotation.y + Math.PI
    );
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

  // Render the scene
  function animate() {
    requestAnimationFrame(animate);
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
    water.material.uniforms["time"].value += 1.0 / 2330.0;

    renderer.render(scene, camera);
  }
}

function isMarineLife(type) {
  switch (type) {
    case "turtle":
      return true;
    case "trash":
      return false;
    default:
      return false;
  }
}

function endGame() {
  worker.postMessage({ type: "close" });

  gameOverFlag = true; // Set the game over flag to true

  keyboard = {};

  for (const [key, mesh] of Object.entries(itemMeshes)) {
    scene.remove(mesh);
  }

  // Display the player's score and name as a CSS overlay
  const scoreOverlay = document.createElement("div");
  scoreOverlay.id = "score-overlay";
  scoreOverlay.innerHTML = "Game Over";
  scoreOverlay.innerHTML += "<br>Name: " + playerName;
  scoreOverlay.innerHTML += "<br>Score: " + localScore;
  document.body.appendChild(scoreOverlay);

  // Create a restart button
  const restartBtn = document.createElement("button");
  restartBtn.innerHTML = "Restart";
  restartBtn.style.position = "absolute";
  restartBtn.style.top = "100px";
  restartBtn.style.left = "10px";
  restartBtn.addEventListener("click", function () {
    window.location.reload();
  });
  document.body.appendChild(restartBtn);

  clearTimeout(timerId);
}

// Create a function to start the timer
function startTimer() {
  timerId = setTimeout(function () {}, remainingTime * 1000);
}
