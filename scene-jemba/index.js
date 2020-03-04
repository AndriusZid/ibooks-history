import '@babel/polyfill';
import * as TWEEN from './js/tween';
import * as THREE from './build/three.module.js';
// import Stats from './jsm/libs/stats.module.js';
import { GUI } from './jsm/libs/dat.gui.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { ColladaLoader } from './jsm/loaders/ColladaLoader.js';
import { RenderPass } from './jsm/postprocessing/RenderPass.js';
import { EffectComposer } from './jsm/postprocessing/EffectComposer.js';
import { OutlinePass } from './jsm/postprocessing/OutlinePass.js';
import Hammer from 'hammerjs';

var container, stats, controls;
var camera, scene, renderer;
var composer, outlinePass;
var model;
var mouse = new THREE.Vector2();
var raycaster = new THREE.Raycaster();

var cameraTargets = {
    "hotspot-aborigines": {
        x: 0.8, y: 1.5, z: -1.8
    },
    "hotspot-camps": {
        x: 1.5, y: 1.4, z: -1.3
    },
    "hotspot-officials": {
        x: -0.3, y: 1.3, z: -2
    },
    "hotspot-settlers": {
        x: 0.3, y: 1.2, z: -2
    },
    "hotspot-ship": {
        x: 0.4, y: 1.2, z: 2
    },
};
var hotspots;
var selectedTooltip = null;
var controlsSelectedTooltip = null;
var features = {
    loader: true,
    navigation: true,
};

init();
animate();

function init() {
    var gui;
    // if (process.env.NODE_ENV !== 'production') {
    //     gui = new GUI();
    // }

    container = document.getElementById('container');

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 8, -6);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

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
            }, 1000);
        }
    };

    // models
    var loader = new ColladaLoader(loadingManager);

    function makeSprite(pos, name, showHelper = false) {
        var spriteMap = new THREE.TextureLoader().load( "africa.svg" );
        var spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap, color: 0xffffff } );
        var sprite = new THREE.Sprite( spriteMaterial );
        sprite.position.set(pos.x, pos.y, pos.z);
        sprite.scale.set(0.5,0.5,0.5);
        sprite.name = name;

        if (gui && name && showHelper) {
            gui.add(sprite.position, 'z', -10, 10).name(name + 'z').step(0.1).listen();
            gui.add(sprite.position, 'x', -10, 10).name(name + 'x').step(0.1).listen();
            gui.add(sprite.position, 'y', -10, 10).name(name + 'y').step(0.1).listen();
        }
        return sprite;
    }

    loader.load('./models/model6/jemba.dae', function (dae) {
        model = dae.scene;
        for (var mat in dae.library.materials) {
            dae.library.materials[mat].build.alphaTest = 0.05;
            dae.library.materials[mat].build.side = THREE.DoubleSide;
            dae.library.materials[mat].build.shininess = 5;
        }

        model.scale.set(2,2,2);

        hotspots = [];

        model.traverse(function (child) {
            if (child.name.includes('hotspot')) {
                hotspots.push(child);
            }

            if (child.name === 'rock') {
                var texture = new THREE.TextureLoader().load( "./models/model6/stone-lm.png");
                child.material.lightMap = texture;
                child.material.lightMapIntensity = 0.3;
            }

            if (child.name === 'sand') {
                var texture = new THREE.TextureLoader().load( "./models/model6/sand-lm.png");
                child.material.lightMap = texture;
                child.material.lightMapIntensity = 0.2;
            }

            if (child.name === 'water') {
                var texture = new THREE.TextureLoader().load( "./models/model6/water-lm.png");
                child.material.lightMap = texture;
                child.material.lightMapIntensity = 0.5;
            }
        });

        outlinePass.selectedObjects = hotspots;
    });

    // lights
    var ambientLight = new THREE.AmbientLight(0xcccccc, 0.45);
    scene.add(ambientLight);
    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(0, 2.5, -10).normalize();
    scene.add(directionalLight);

    // gui.add(directionalLight.position, 'z', -10, 10).name('light1' + 'z').step(0.1).listen();
    // gui.add(directionalLight.position, 'x', -10, 10).name('light1' + 'x').step(0.1).listen();
    // gui.add(directionalLight.position, 'y', -10, 10).name('light1' + 'y').step(0.1).listen();

    var directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight2.position.set(10, 10, 5).normalize();
    scene.add(directionalLight2);


    // gui.add(directionalLight2.position, 'z', -10, 10).name('light2' + 'z').step(0.1).listen();
    // gui.add(directionalLight2.position, 'x', -10, 10).name('light2' + 'x').step(0.1).listen();
    // gui.add(directionalLight2.position, 'y', -10, 10).name('light2' + 'y').step(0.1).listen();

    var directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight3.position.set(-10, -4, 5).normalize();
    scene.add(directionalLight3);

    // gui.add(directionalLight3.position, 'z', -10, 10).name('light3' + 'z').step(0.1).listen();
    // gui.add(directionalLight3.position, 'x', -10, 10).name('light3' + 'x').step(0.1).listen();
    // gui.add(directionalLight3.position, 'y', -10, 10).name('light3' + 'y').step(0.1).listen();

    function makePointLight(pos, name) {
        var pointLight;
        pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(pos.x, pos.y, pos.z);
        // pointLight.angle = Math.PI / 8;
        pointLight.decay = 1;
        pointLight.distance = 4;
        pointLight.penumbra = 0;

        if (gui && name) {
            gui.add(pointLight.position, 'z', -10, 10).name(name + 'z').step(0.1).listen();
            gui.add(pointLight.position, 'x', -10, 10).name(name + 'x').step(0.1).listen();
            gui.add(pointLight.position, 'y', -10, 10).name(name + 'y').step(0.1).listen();
        }
        return pointLight;
    }

    const point1 = makePointLight({x: 0.1, y: 0.6, z: -2.5});
    scene.add(point1);

    // renderer

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // renderer.shadowMap.enabled = true;
    // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // controls 
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.03;
    controls.enablePan = false;
    controls.screenSpacePanning = false;
    controls.minDistance = 0.01;
    controls.maxDistance = 6;
    controls.target.set(0, 1, 3);
    controls.zoomSpeed = 0.9;
    // Polar limits top bottom
    controls.maxPolarAngle = Math.PI / 1.95;
    controls.minPolarAngle = Math.PI / 2.5;
    // controls.maxAzimuthAngle = Math.PI / 2; 
    // controls.minAzimuthAngle = Math.PI / -2;
    controls.update();
    //
    // stats = new Stats();
    // container.appendChild( stats.dom );
    //
    window.addEventListener('resize', onWindowResize, false);


    var hammertime = new Hammer(document.querySelector('#container'), {});
    hammertime.on('tap', function (ev) {
        onDocumentClick(ev);
    });

    if (process.env.NODE_ENV !== 'production' && gui) {
        //     gui.add(ambientLight, 'intensity', 0, 4).name("Ambient light").step(0.01).listen();
        //     gui.add(spotLight, 'intensity', 0, 4).name("Spot light").step(0.01).listen();
        //     gui.add(spotLight, 'penumbra', 0, 1).name("Spot feather").step(0.01).listen();
        //     gui.add(fireLight, 'intensity', 0, 4).name("Firelight").step(0.01).listen();

        //     // gui.add(fireLight.position, 'z', -50, 50).name('fire z').step(0.1).listen();
        //     // gui.add(fireLight.position, 'x', -50, 50).name('fire x').step(0.1).listen();
        //     // gui.add(fireLight.position, 'y', -50, 50).name('fire y').step(0.1).listen();

        gui.add(camera.position, 'z', -50, 50).step(0.1).listen();
        gui.add(camera.position, 'x', -50, 50).step(0.1).listen();
        gui.add(camera.position, 'y', -50, 50).step(0.1).listen();
    }

    // postprocessing

    composer = new EffectComposer( renderer );

    var renderPass = new RenderPass( scene, camera );
    composer.addPass( renderPass );

    outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
    outlinePass.edgeStrength = 4;
    outlinePass.edgeGlow = 1;
    outlinePass.edgeThickness = 3;
    outlinePass.pulsePeriod = 5;
    outlinePass.hiddenEdgeColor = new THREE.Color(0x000000);
    composer.addPass( outlinePass );

    //
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

    // removed this for intuitivity
    // if (activeTooltip) {
    //     setupTween(cameraTarget);
    // }
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

    hotspots.forEach(function (agent) {
        var inter = raycaster.intersectObject(agent, true);
        if (inter.length) {
            interStack = interStack.concat(inter);
        }
    });

    if (interStack.length && interStack[0].object.name !== 'Table') {
        return interStack[0].object.name;
    }

    return null;
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


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    render();
    composer.render();
    // stats.update();
}
function render() {
    controls.update();
    renderer.render(scene, camera);
}
