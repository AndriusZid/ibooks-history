import '@babel/polyfill';
import * as TWEEN from '@scripts/js/tween';
import * as THREE from '@scripts/build/three.module.js';
import Stats from '@scripts/jsm/libs/stats.module.js';
import { GUI } from '@scripts/jsm/libs/dat.gui.module.js';
import { OrbitControls } from '@scripts/jsm/controls/OrbitControls.js';
import { ColladaLoader } from '@scripts/jsm/loaders/ColladaLoader.js';

import { addEvents } from '@scripts/onDocumentClick';
import { addControls } from '@scripts/addControls';
import { onWindowResize } from '@scripts/onWindowResize';
import tooltips from '@scripts/tooltips';

var container, stats, controls;
var camera, scene, renderer;
var model;
var features = {
    loader: true,
    navigation: true,
    sfx: true
};

window.cameraTargets = {
    "hotspot-1": {
        x: -2.6, y: 3.1, z: 6.4
    },
    "hotspot-2": {
        x: -3.6, y: 2.9, z: 2.3
    },
    "hotspot-3": {
        x: -4, y: 3.4, z: -5.5
    },
    "hotspot-4": {
        x: -4.6, y: 3.4, z: 5
    },
    "hotspot-5": {
        x: -1.6, y: 1.3, z: 0
    }
};
window.hotspots = [];
window.selectedTooltip = null;
window.controlsSelectedTooltip = null;
window.audioLib = {
    ambient: null,
    muteButton: document.getElementById('mute-button'),
    unmuteButton: document.getElementById('unmute-button'),
    mute: false,
    hotspots: {
        "hotspot-1": null,
        "hotspot-2": null,
        "hotspot-3": null,
        "hotspot-4": null,
        "hotspot-5": null,
    }
};

init();
animate();

function init() {
    container = document.getElementById('container');

    var gui;
    if (window.location.hash === '#debug') {
        gui = new GUI();
        stats = new Stats();
        container.appendChild(stats.dom);
    }

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 5, 6);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEFA);

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
    var textureLoader = new THREE.TextureLoader();
    var loader = new ColladaLoader(loadingManager);

    loader.load('./models/model6/chicago.dae', function (dae) {
        model = dae.scene;
        for (var mat in dae.library.materials) {
            dae.library.materials[mat].build.alphaTest = 0.05;
            dae.library.materials[mat].build.side = THREE.DoubleSide;
            dae.library.materials[mat].build.shininess = 30;
        }

        model.scale.set(4, 4, 4);

        model.traverse(function (child) {
            if (child.name.includes('hotspot')) {
                hotspots.push(child);
            }

            const lightMapIntensity = 0.3;


            if (child.name.includes('hotspot-1')) {
                child.material.map = textureLoader.load('./models/model6/3D notes-04_02.png');
            }

            if (child.name.includes('ground')) {
                var texture = textureLoader.load("./models/model6/ground-lm.jpg");
                child.material.lightMap = texture;
                child.material.lightMapIntensity = lightMapIntensity + 0.4;
            }

            if (child.name.includes('sky')) {
                var texture = textureLoader.load("./models/model6/frame-lm.png");
                child.material.lightMap = texture;
                child.material.lightMapIntensity = lightMapIntensity + 0;
                
            }
        });

        if (features.sfx) {
            audioLib.hotspots["hotspot-1"] = new Audio('./audio/Tom Brown 3d Endangering Enviroment.m4a');
            audioLib.hotspots["hotspot-2"] = new Audio('./audio/Tom Brown 3d Beef Trust.m4a');
            audioLib.hotspots["hotspot-3"] = new Audio('./audio/Tom Brown 3d As Far as the eye could see.m4a');
            audioLib.hotspots["hotspot-4"] = new Audio('./audio/Tom Brown 3d A growing concern.m4a');
            audioLib.hotspots["hotspot-5"] = new Audio('./audio/Tom Brown 3d Muckraking.m4a');

            audioLib.ambient = new Audio('./audio/Tom Brown 3d Background.m4a');
            audioLib.ambient.loop = true;
            try {
                audioLib.ambient.play();
            } catch (e) {
                // for autoplay https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide
            }

            audioLib.muteButton.addEventListener('click', () => {
                audioLib.ambient.pause();
                audioLib.muteButton.style.display = 'none';
                audioLib.unmuteButton.style.display = 'block';
                audioLib.mute = true;
            });

            audioLib.unmuteButton.addEventListener('click', () => {
                audioLib.ambient.play();
                audioLib.unmuteButton.style.display = 'none';
                audioLib.muteButton.style.display = 'block';
                audioLib.mute = false;
            });
        } else {
            audioLib.muteButton.style.display = 'none';
        }
    });

    // lights
    var ambientLight = new THREE.AmbientLight(0xcccccc, 0.5);
    scene.add(ambientLight);
    // var directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    // directionalLight.position.set(0, 2, 1).normalize();
    // scene.add(directionalLight);

    var light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 0.6 );
    scene.add( light );

    // renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // controls 
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.03;
    // controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.minDistance = 0.01;
    controls.maxDistance = 13;
    controls.target.set(0, 1, 0);
    controls.zoomSpeed = 0.5;
    controls.maxPolarAngle = Math.PI / 1.95;
    // controls.minPolarAngle = Math.PI / 4;
    controls.update();

    var minPan = new THREE.Vector3(-4, -3, -4);
    var maxPan = new THREE.Vector3(6, 2, 6);
    var _v = new THREE.Vector3();

    controls.addEventListener("change", function () {
        _v.copy(controls.target);
        controls.target.clamp(minPan, maxPan);
        _v.sub(controls.target);
        camera.position.sub(_v);
    });

    window.addEventListener('resize', onWindowResize, false);

    window.addEventListener("resize", onWindowResize, false);
    window.camera = camera;
    window.controls = controls;
    window.renderer = renderer;
    window.scene = scene;

    addEvents();
    tooltips();

    if (window.location.hash === '#debug') {
        //     gui.add(ambientLight, 'intensity', 0, 4).name("Ambient light").step(0.01).listen();
        //     gui.add(spotLight, 'intensity', 0, 4).name("Spot light").step(0.01).listen();
        //     gui.add(spotLight, 'penumbra', 0, 1).name("Spot feather").step(0.01).listen();
        //     gui.add(fireLight, 'intensity', 0, 4).name("Firelight").step(0.01).listen();

        //     // gui.add(fireLight.position, 'z', -50, 50).name('fire z').step(0.1).listen();
        //     // gui.add(fireLight.position, 'x', -50, 50).name('fire x').step(0.1).listen();
        //     // gui.add(fireLight.position, 'y', -50, 50).name('fire y').step(0.1).listen();

        gui.add(camera.position, 'x', -50, 50).step(0.1).listen();
        gui.add(camera.position, 'y', -50, 50).step(0.1).listen();
        gui.add(camera.position, 'z', -50, 50).step(0.1).listen();
    }
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    render();

    if (window.location.hash === '#debug') {
        stats.update();
    }
}

function render() {
    controls.update();
    renderer.render(scene, camera);
}
