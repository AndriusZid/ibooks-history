import '@babel/polyfill';
import * as TWEEN from '@scripts/js/tween';
import * as THREE from '@scripts/build/three.module.js';
import Stats from '@scripts/jsm/libs/stats.module.js';
import { GUI } from '@scripts/jsm/libs/dat.gui.module.js';
import { OrbitControls } from '@scripts/jsm/controls/OrbitControls.js';
import { ColladaLoader } from '@scripts/jsm/loaders/ColladaLoader.js';

import { EffectComposer } from '@scripts/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '@scripts/jsm/postprocessing/RenderPass.js';
import { BokehPass } from '@scripts/jsm/postprocessing/BokehPass.js';

import { addEvents } from '@scripts/onDocumentClick';
import { addControls } from '@scripts/addControls';
import { onWindowResize } from '@scripts/onWindowResize';
import tooltips from '@scripts/tooltips';

var container, stats, controls;
var camera, scene, renderer, scene2;
var model, modelBackground;
var features = {
    loader: true,
    navigation: true,
};
var width = window.innerWidth;
var height = window.innerHeight;
var postprocessing = {};
var sceneRendering;

window.cameraTargets = {
    "hotspot-1": {
        x: 2.3, y: 0.5, z: 3.1
    },
    "hotspot-2": {
        x: 2.2, y: -0.3, z: 2.9
    },
    "hotspot-3": {
        x: 2.2, y: -0.3, z: 2.9
    },
    "hotspot-4": {
        x: 2.2, y: -0.3, z: 2.9
    },
    "hotspot-5": {
        x: 2.2, y: -0.3, z: 2.9
    },
    "hotspot-6": {
        x: 2.2, y: -0.3, z: 2.9
    },
    "hotspot-7": {
        x: 0.0, y: -1.6, z: 3
    },
    "hotspot-8": {
        x: -2.2, y: -0.3, z: 2.9
    },
    "hotspot-9": {
        x: -2.2, y: -0.3, z: 2.9
    },
    "hotspot-10": {
        x: -2.2, y: -0.3, z: 2.9
    },
    "hotspot-11": {
        x: -2.2, y: -0.3, z: 2.9
    },
    "hotspot-12": {
        x: -2.2, y: -0.3, z: 2.9
    },
};
window.hotspots = [];
window.selectedTooltip = null;
window.controlsSelectedTooltip = null;

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
    camera.position.set(0, 0, 6);
    scene = new THREE.Scene();
    scene2 = new THREE.Scene();
    // scene.background = new THREE.Color(0x000000);
    // scene2.background = new THREE.Color(0x000000);

    // loading manager
    var loadingManager = new THREE.LoadingManager(function () {
        scene.add(model);
        scene2.add(modelBackground);
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

    loader.load('./models/model6/mask.dae', function (dae) {
        for (var mat in dae.library.materials) {
            dae.library.materials[mat].build.alphaTest = 0.05;
            // dae.library.materials[mat].build.side = THREE.DoubleSide;
            dae.library.materials[mat].build.shininess = 5;
        }

        dae.scene.traverse(function (child) {
            if (child.name.includes('hotspot')) {
                hotspots.push(child);
            }

            if (child.name === 'feather') {
                child.material.color = new THREE.Color(0xffffff);
                // child.material.combine = THREE.AddOperation;
                child.material.map = textureLoader.load('./models/model6/mask%20f_%20copy.png');
                child.material.normalMap = textureLoader.load('./models/model6/mask%20f_%20copy_NRM.jpg');
                child.material.normalScale = new THREE.Vector2(0.3, 0.3);
            }

            if (child.name === 'mask') {
                child.material.color = new THREE.Color(0xffeeee);
                child.material.bumpMap = textureLoader.load('./models/model6/Seamless-white-crease-paper-texture_NRM.jpg');
                child.material.bumpScale = 0.015;
            }
        });

        model = dae.scene;
    });

    loader.load('./models/model6/khari.dae', function (dae) {
        modelBackground = dae.scene;
    });

    // lights for background scene
    var ambientLight = new THREE.AmbientLight(0xcccccc, 0.2);
    scene.add(ambientLight);

    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(0, 1, 1).normalize();
    scene.add(directionalLight);

    var directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight2.position.set(1, 1, 0).normalize();
    scene.add(directionalLight2);

    var directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight3.position.set(-1, 1, 0).normalize();
    scene.add(directionalLight3);

    // lights for mask scene
    var ambientLight2 = new THREE.AmbientLight(0xcccccc, 0.2);
    scene2.add(ambientLight2);

    var directionalLight4 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight4.position.set(0, 1, 1).normalize();
    scene2.add(directionalLight4);

    var directionalLight5 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight5.position.set(1, 1, 0).normalize();
    scene2.add(directionalLight5);

    var directionalLight6 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight6.position.set(-1, 1, 0).normalize();
    scene2.add(directionalLight6);

    // renderer
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor( 0x000000, 0 );
    container.appendChild(renderer.domElement);

    initPostprocessing();
    renderer.autoClear = false;

    // controls 
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.03;
    controls.enablePan = false;
    controls.screenSpacePanning = false;
    controls.minDistance = 3;
    controls.maxDistance = 9;
    controls.target.set(0, 1, 0);
    controls.zoomSpeed = 0.5;
    // Polar limits top bottom
    controls.maxPolarAngle = Math.PI / 1.6;
    controls.minPolarAngle = Math.PI / 5;
    controls.maxAzimuthAngle = Math.PI / 3;
    controls.minAzimuthAngle = Math.PI / -3;
    controls.update();

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

        gui.add(camera.position, 'z', -50, 50).step(0.1).listen();
        gui.add(camera.position, 'x', -50, 50).step(0.1).listen();
        gui.add(camera.position, 'y', -50, 50).step(0.1).listen();

        var effectController = {
            focus: 500.0,
            aperture:	5,
            maxblur:	1.0
        };

        var matChanger = function ( ) {
            postprocessing.bokeh.uniforms[ "focus" ].value = effectController.focus;
            postprocessing.bokeh.uniforms[ "aperture" ].value = effectController.aperture * 0.00001;
            postprocessing.bokeh.uniforms[ "maxblur" ].value = effectController.maxblur;
        };

        gui.add( effectController, "focus", 10.0, 3000.0, 10 ).onChange( matChanger );
        gui.add( effectController, "aperture", 0, 10, 0.1 ).onChange( matChanger );
        gui.add( effectController, "maxblur", 0.0, 3.0, 0.025 ).onChange( matChanger );
        gui.close();

        matChanger();
    }
}

function initPostprocessing() {

    var renderPass = new RenderPass( scene2, camera );
    var renderPass2 = new RenderPass( scene, camera );
    renderPass2.clear = false;

    var bokehPass = new BokehPass( scene2, camera, {
        focus: 1.0,
        aperture:	0.025,
        maxblur:	1.0,

        width: width,
        height: height
    } );

    var composer = new EffectComposer( renderer );
    var composer2 = new EffectComposer( renderer );

    composer.addPass( renderPass );
    composer.addPass( bokehPass );

    composer2.addPass( renderPass2 );

    postprocessing.composer = composer;
    postprocessing.bokeh = bokehPass;

    sceneRendering = composer2;
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
    renderer.clear();
    postprocessing.composer.render();
    renderer.clearDepth();
    sceneRendering.render();
}
