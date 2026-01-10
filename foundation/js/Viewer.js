import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Viewer {
    constructor(container) {
        this.container = container;
        this.width = container.clientWidth;
        this.height = container.clientHeight;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f2f5);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100000);
        this.camera.position.set(5000, 5000, 5000);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // Tekla Style Navigation
        // Default: Middle Mouse = Pan, Scroll = Zoom, Ctrl + Middle = Rotate
        this.controls.mouseButtons = {
            LEFT: null, // Select (TODO)
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.ROTATE
        };

        // Listen for keys to toggle Rotate mode on Ctrl
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(2000, 5000, 2000);
        this.scene.add(dirLight);

        // Helpers
        this.gridHelper = new THREE.GridHelper(10000, 10, 0x888888, 0xdddddd);
        this.scene.add(this.gridHelper);

        this.axesHelper = new THREE.AxesHelper(1000);
        this.scene.add(this.axesHelper);

        // Foundation Mesh
        this.material = new THREE.MeshPhongMaterial({
            color: 0x999999,
            flatShading: true,
            transparent: false,
            opacity: 0.5
        });
        this.geometry = new THREE.BoxGeometry(1, 1, 1);
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        // Pivot adjustment: Geometry center is 0,0,0. We want bottom center to be 0,0,0 potentially?
        // Ideally foundation top or bottom. Let's stick to center for now, or lift it up by H/2.

        this.scene.add(this.mesh);

        // Events
        window.addEventListener('resize', this.onResize.bind(this));

        this.animate();
    }

    updateFoundation(width, length, height, transparent) {
        // Recreate geometry or scale it. Scaling is easier for BoxGeometry.
        // Units are in mm.
        this.mesh.scale.set(width, height, length);

        // Position it so it sits on the grid (y = height/2)
        this.mesh.position.y = height / 2;

        this.material.transparent = transparent;
        this.material.opacity = transparent ? 0.3 : 1.0;
        this.material.needsUpdate = true;
    }

    setGridVisibility(visible) {
        this.gridHelper.visible = visible;
    }

    onResize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    onKeyDown(event) {
        if (event.ctrlKey) {
            this.controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE;
            this.controls.update();
        }
    }

    onKeyUp(event) {
        if (!event.ctrlKey) {
            this.controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
            this.controls.update();
        }
    }

    setView(viewType) {
        // Reset target to center
        this.controls.target.set(0, 0, 0);

        const distance = 5000;

        if (viewType === 'top') {
            this.camera.position.set(0, distance, 0);
            this.camera.up.set(0, 0, -1); // Tekla style: Z is up on screen? No, usually Y is up in ThreeJS.
            // Let's stick to standard Y-up for now.
            // If we look from top (0, dist, 0), looking at (0,0,0), then top of screen is -Z.
            this.camera.lookAt(0, 0, 0);
        } else if (viewType === '3d') {
            this.camera.position.set(distance, distance, distance);
            this.camera.up.set(0, 1, 0);
            this.camera.lookAt(0, 0, 0);
        }

        this.controls.update();
    }
}
