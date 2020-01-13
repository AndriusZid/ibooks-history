import * as TWEEN from './js/tween';
import * as THREE from './build/three.module.js';
// import Stats from './jsm/libs/stats.module.js';
import { GUI } from './jsm/libs/dat.gui.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { ColladaLoader } from './jsm/loaders/ColladaLoader.js';
import Hammer from 'hammerjs';

var container, stats, controls;
var camera, scene, renderer;
var mouse = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var model, agents, papers;

var cameraTargets = {
    AgentMain: {
        x: -0, y: 1, z: 4
    },
    Agent1: {
        x: -5, y: 2, z: 0
    },
    Agent2: {
        x: -3, y: 2, z: -3
    },
    Agent3: {
        x: -1, y: 2, z: -4
    },
    Agent4: {
        x: 2, y: 2, z: -4
    },
    Agent5: {
        x: 4, y: 2, z: -2
    },
    Agent6: {
        x: 4, y: 2, z: 0
    },
    PaperWest: {
        x: -2, y: 2, z: 2
    },
    PaperNorth: {
        x: -2, y: 2, z: 2
    },
    PaperEast: {
        x: 2, y: 2, z: 2
    },
    PaperSouth: {
        x: 1, y: 2, z: 2
    }
};
var selectedTooltip = null;
var controlsSelectedTooltip = null;
var features = {
    loader: true,
    touchEvents: true,
    navigation: true,
};

init();
animate();

function init() {
    container = document.getElementById('container');

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(4, 5, 5);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    // loading manager
    var loadingManager = new THREE.LoadingManager(function () {
        scene.add(model);
    });

    loadingManager.onProgress = function (url, loaded, total) {
        if (total === loaded) {
            setTimeout(function () {
                var uiLoader = document.getElementById('loader');
                if (uiLoader && features.loader) {
                    uiLoader.classList.add('off');
                }
                if (features.navigation) {
                    addControls();
                }

                addAudioControls();
            }, 1000);
        }
    };

    // models
    var loader = new ColladaLoader(loadingManager);

    loader.load('./models/Opium wars_1.DAE', function (collada) {
        model = collada.scene;
        for (var mat in collada.library.materials) {
            collada.library.materials[mat].build.side = THREE.DoubleSide;
            collada.library.materials[mat].build.alphaTest = 0.05;
        }

        agents = [];

        agents = model.children.filter(function (mod) {
            return mod.name.includes('Agent');
        });

        papers = [];

        papers = model.children.filter(function (mod) {
            return mod.name.includes('Paper');
        });
    });

    // lights
    var ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
    scene.add(ambientLight);
    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.1);
    directionalLight.position.set(0, 1, 1).normalize();
    scene.add(directionalLight);
    var spotLight;
    spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(0, 2, 0);
    var targetObject = new THREE.Object3D();
    targetObject.position.set(0, 1.5, 1.3);
    scene.add(targetObject);
    spotLight.target = targetObject;
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.05;
    spotLight.decay = 1;
    spotLight.distance = 50;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 10;
    spotLight.shadow.camera.far = 800;
    scene.add(spotLight);

    // renderer

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // controls 
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.target.set(0, 1, 0);
    controls.maxPolarAngle = Math.PI / 2;
    controls.update();
    //
    // stats = new Stats();
    // container.appendChild( stats.dom );
    //
    window.addEventListener('resize', onWindowResize, false);

    // add events

    var hammertime = new Hammer(document.querySelector('#container'), {});
    hammertime.on('tap', function(ev) {
        onDocumentClick(ev);
    });

    if (process.env.NODE_ENV !== 'production') {
        var gui = new GUI();

        gui.add(camera.position, 'z', -50, 50).step(0.1).listen();
        gui.add(camera.position, 'x', -50, 50).step(0.1).listen();
        gui.add(camera.position, 'y', -50, 50).step(0.1).listen();
    }
}

var uiTooltips = document.getElementById('tooltips');

if (uiTooltips) {
    uiTooltips.addEventListener('click', function (e) {
        if (e.target.matches('.tooltip-close')) {
            selectedTooltip = null;
            toggleTooltip(null);
        }
    });
}

function toggleTooltip(activeTooltip) {
    document.querySelectorAll('.tooltip').forEach(function (tooltip) {
        tooltip.classList.remove('active');
    });

    if (activeTooltip) {
        activeTooltip.classList.add('active');
        document.getElementById('tooltips').classList.add('tooltip-open');
    } else {
        document.getElementById('tooltips').classList.remove('tooltip-open');
    }
}

function onDocumentClick(event) {
    if (event.target.matches('.tooltip') || event.target.parentElement.matches('.tooltip')) {
        return;
    }

    if (event.target.matches('.controls') ||
        event.target.parentElement.matches('.controls') ||
        event.target.parentElement.parentElement.matches('.controls')
    ) {
        return;
    }
    
    selectedTooltip = getIntersects(event);

    var activeTooltip = document.getElementById(selectedTooltip);
    toggleTooltip(activeTooltip);

    var cameraTarget;

    // console.log(camera.position);

    if (selectedTooltip) {
        controlsSelectedTooltip = selectedTooltip;
        setControlLabel(controlsSelectedTooltip);
        cameraTarget = cameraTargets[selectedTooltip];
    }

    if (activeTooltip) {
        setupTween(cameraTarget);
    }
}

function setupTween(target) {
    new TWEEN.Tween(camera.position)
        .to(target, 1100)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(function () {
            controls.target.set(0, 1, 0);
            controls.update();
        })
        .start();
}

function getIntersects(event) {
    if (event.srcEvent) {
        mouse.x = (event.srcEvent.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.srcEvent.clientY / window.innerHeight) * 2 + 1;
    } else {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }

    raycaster.setFromCamera(mouse, camera);

    var interStack = [];
    var inter = raycaster.intersectObject(model.children.filter(function (model) {
        return model.name === 'Table';
    })[0], true);

    interStack = interStack.concat(inter);

    agents.forEach(function (agent) {
        var inter = raycaster.intersectObject(agent, true);
        if (inter.length) {
            interStack = interStack.concat(inter);
        }
    });

    papers.forEach(function (paper) {
        var inter = raycaster.intersectObject(paper, true);
        if (inter.length) {
            interStack = interStack.concat(inter);
        }
    });

    interStack.sort((a, b) => { return a.distance - b.distance });

    if (interStack.length && interStack[0].object.name !== 'Table') {
        return interStack[0].object.name;
    }

    return null;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    TWEEN.update();
    requestAnimationFrame(animate);
    render();
    // stats.update();
}
function render() {
    controls.update();
    renderer.render(scene, camera);
}

function setControlLabel(tooltipId) {
    var tooltip = document.getElementById(tooltipId);
    var currentLabelElement = document.getElementById('controls-current');
    currentLabelElement.innerText = tooltip.querySelector('h2').innerText;

    toggleTooltip(tooltip);
}

function addControls() {
    var tooltips = document.querySelectorAll('.tooltip');
    var tooltipsCount = tooltips.length;
    document.getElementById('controls').style.display = 'block';

    document.getElementById('next').addEventListener('click', function (e) {
        e.preventDefault();
        var currentOrder = document.getElementById(controlsSelectedTooltip);
        var nextTooltip;
        if (currentOrder) {
            nextTooltip = (parseInt(currentOrder.getAttribute('data-order')) - 1);
            if (nextTooltip > 0) {
                setControlLabel(document.querySelector(`[data-order="${nextTooltip}"]`).id);
                controlsSelectedTooltip = document.querySelector(`[data-order="${nextTooltip}"]`).id;
                setupTween(cameraTargets[controlsSelectedTooltip]);
                return;
            }
        }

        setControlLabel(document.querySelector(`[data-order="${tooltipsCount}"]`).id);
        controlsSelectedTooltip = document.querySelector(`[data-order="${tooltipsCount}"]`).id;
        setupTween(cameraTargets[controlsSelectedTooltip]);
    });

    document.getElementById('prev').addEventListener('click', function (e) {
        e.preventDefault();
        var currentOrder = document.getElementById(controlsSelectedTooltip);
        var nextTooltip;
        if (currentOrder) {
            nextTooltip = (parseInt(currentOrder.getAttribute('data-order'))) % tooltipsCount + 1;
            setControlLabel(document.querySelector(`[data-order="${nextTooltip}"]`).id);
            controlsSelectedTooltip = document.querySelector(`[data-order="${nextTooltip}"]`).id;
            setupTween(cameraTargets[controlsSelectedTooltip]);
        } else {
            setControlLabel(document.querySelector(`[data-order="1"]`).id);
            controlsSelectedTooltip = document.querySelector(`[data-order="1"]`).id;
            setupTween(cameraTargets[controlsSelectedTooltip]);
        }
    });
}

function addAudioControls() {
    var muteButton = document.getElementById('mute-button');
    var unmuteButton = document.getElementById('unmute-button');
    var music = document.getElementById('music');

    muteButton.addEventListener('click', function () {
        muteButton.style.display = 'none';
        unmuteButton.style.display = 'block';

        music.muted = true;
        console.log(music.muted);
    });

    unmuteButton.addEventListener('click', function () {
        unmuteButton.style.display = 'none';
        muteButton.style.display = 'block';

        music.muted = false;
        console.log(music.muted);
    });

    setTimeout(function () {
        if (music.paused) {
            music.play();
        }
    }, 2000);
}
