import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PhysicalBall } from './physicsCore1.js';
import { checkTableBoundaries, checkBallCollisions } from './physics.js';
import GUI from 'lil-gui';
import { RESTITUTION } from './resolveCollision.js';

// 1. مصفوفات لتخزين الكرات (الفيزيائية والرسومية)
const physicalBalls = [];
const visualBalls = [];

// ==========================================================
// 2. إعداد المشهد والبيئة المحيطة (غرفة رمادية مريحة)
// ==========================================================
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1e2022, 0.03);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 6, 8); // زاوية رؤية علوية ممتازة لمراقبة الاصطدامات والثقوب

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05;

// جدران وأرضية الغرفة الرمادية
const roomGeo = new THREE.BoxGeometry(40, 20, 40);
const roomMat = new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.9, side: THREE.BackSide });
const room = new THREE.Mesh(roomGeo, roomMat);
room.position.y = 10;
room.receiveShadow = true;
scene.add(room);

// ==========================================================
// 3. نظام الإضاءة (إضاءة علوية مركزة وقوية)
// ==========================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const tableLight = new THREE.DirectionalLight(0xffffff, 2.2);
tableLight.position.set(0, 12, 0);
tableLight.castShadow = true;
tableLight.shadow.mapSize.width = 2048;
tableLight.shadow.mapSize.height = 2048;
tableLight.shadow.bias = -0.0002;
const d = 6;
tableLight.shadow.camera.left = -d;
tableLight.shadow.camera.right = d;
tableLight.shadow.camera.top = d;
tableLight.shadow.camera.bottom = -d;
scene.add(tableLight);

const lampGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32);
const lampMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
const lamp = new THREE.Mesh(lampGeo, lampMat);
lamp.position.set(0, 11.9, 0);
scene.add(lamp);

// ==========================================================
// 4. أداة استدعاء وحقن الصور (Textures) للكرات
// ==========================================================
const textureLoader = new THREE.TextureLoader();

import ball01 from 'url:../models/ball01.jpg';
import ball02 from 'url:../models/ball02.jpg';
import ball03 from 'url:../models/ball03.jpg';
import ball04 from 'url:../models/ball04.jpg';
import ball05 from 'url:../models/ball05.jpg';
import ball06 from 'url:../models/ball06.jpg';
import ball07 from 'url:../models/ball07.jpg';
import ball08 from 'url:../models/ball08.jpg';
import ball09 from 'url:../models/ball09.jpg';
import ball10 from 'url:../models/ball10.jpg';
import ball11 from 'url:../models/ball11.jpg';
import ball12 from 'url:../models/ball12.jpg';
import ball13 from 'url:../models/ball13.jpg';
import ball14 from 'url:../models/ball14.jpg';
import ball15 from 'url:../models/ball15.jpg';

const ballTexturesMap = {
    '01': ball01, '02': ball02, '03': ball03, '04': ball04, '05': ball05,
    '06': ball06, '07': ball07, '08': ball08, '09': ball09, '10': ball10,
    '11': ball11, '12': ball12, '13': ball13, '14': ball14, '15': ball15
};

// ==========================================================
// 5. هندسة الطاولة الحقيقية المحدثة (حواف عالية وثقوب عميقة غائرة)
// ==========================================================
const tableWidth = 1.27 * 2.5;
const tableLength = 2.54 * 2.5;
const cushionWidth = 0.08 * 2.5;
const legHeight = 1.2;
const boxDepth = 0.40;
const surfaceY = legHeight + boxDepth;

const tableGroup = new THREE.Group();

// أ) جسم الطاولة الصندوقي السفلي
const boxGeo = new THREE.BoxGeometry(tableWidth + (cushionWidth * 2), boxDepth, tableLength + (cushionWidth * 2));
const boxMat = new THREE.MeshStandardMaterial({ color: 0x22130a, roughness: 0.6 });
const tableBox = new THREE.Mesh(boxGeo, boxMat);
tableBox.position.y = legHeight + (boxDepth / 2);
tableBox.castShadow = true;
tableBox.receiveShadow = true;
tableGroup.add(tableBox);

// ب) البساط الأخضر المخملي
const clothGeo = new THREE.BoxGeometry(tableWidth, 0.01, tableLength);
const clothMat = new THREE.MeshStandardMaterial({ color: 0x054626, roughness: 0.8 });
const cloth = new THREE.Mesh(clothGeo, clothMat);
cloth.position.y = surfaceY;
cloth.receiveShadow = true;
tableGroup.add(cloth);

// ج) التعديل الأول: جعل الحواف الخشبية المصدة عالية جداً وسميكة للاصطدامات القوية
function createCushionMesh(w, h, d, x, z) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x301b0f,
        roughness: 0.35
    });
    const cushion = new THREE.Mesh(geo, mat);
    cushion.position.set(x, surfaceY + h/2, z);
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    tableGroup.add(cushion);
}
const cushionH = 0.15;
createCushionMesh(tableWidth + (cushionWidth * 2), cushionH, cushionWidth, 0, (tableLength / 2) + (cushionWidth / 2));
createCushionMesh(tableWidth + (cushionWidth * 2), cushionH, cushionWidth, 0, -(tableLength / 2) - (cushionWidth / 2));
createCushionMesh(cushionWidth, cushionH, tableLength, (tableWidth / 2) + (cushionWidth / 2), 0);
createCushionMesh(cushionWidth, cushionH, tableLength, -(tableWidth / 2) - (cushionWidth / 2), 0);

// د) الأرجل المتينة الضخمة المستقرة على الأرض تماماً
function createLeg(x, z) {
    const legGeo = new THREE.CylinderGeometry(0.15, 0.10, legHeight, 16);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1d1008, roughness: 0.5 });
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, legHeight / 2, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    tableGroup.add(leg);
}
const legX = (tableWidth / 2) + (cushionWidth / 2) - 0.1;
const legZ = (tableLength / 2) + (cushionWidth / 2) - 0.1;
createLeg(legX, legZ);
createLeg(-legX, legZ);
createLeg(legX, -legZ);
createLeg(-legX, -legZ);

// هـ) التعديل الثاني السحري: بناء ثقوب عميقة حقيقية (Pockets) تحفر داخل جسم الطاولة
const pocketRadius = 0.13;
const pocketDepth = 0.20;

function createPocket(x, z) {
    const pocketGeo = new THREE.CylinderGeometry(pocketRadius, pocketRadius, pocketDepth, 32, 1, false);
    const pocketMat = new THREE.MeshBasicMaterial({
        color: 0x020202
    });
    const pocket = new THREE.Mesh(pocketGeo, pocketMat);
    pocket.position.set(x, surfaceY - (pocketDepth / 2) + 0.005, z);
    tableGroup.add(pocket);
}

const pX = tableWidth / 2 - 0.02;
const pZ = tableLength / 2 - 0.02;
createPocket(pX, pZ);
createPocket(-pX, pZ);
createPocket(pX, -pZ);
createPocket(-pX, -pZ);
createPocket(tableWidth / 2, 0);
createPocket(-tableWidth / 2, 0);

scene.add(tableGroup);

// ==========================================================
// 6. دالة إنشاء الكرات المكبرة (1 فيزياء = 1 رسم)
// ==========================================================
let ballIdCounter = 0;
const ballRadius = 0.0285 * 2.5;

function spawnBall(x, z, textureUrl = null) {
    const geometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    let material;

    if (textureUrl) {
        const texture = textureLoader.load(textureUrl);
        texture.colorSpace = THREE.SRGBColorSpace;
        material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.1 });
    } else {
        material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.position.set(x, surfaceY + ballRadius, z);
    scene.add(mesh);
    visualBalls.push(mesh);

    const pBall = new PhysicalBall(ballIdCounter++, x, z);
    physicalBalls.push(pBall);

    return pBall;
}
// ==========================================================
// 7. رصف الكرات وتوزيعها
// ==========================================================

// جعل الكرة البيضاء ساكنة تماماً عند تشغيل المشروع (تنتظر ضربتكِ)
const whiteBallPhysics = spawnBall(0.0, 1.5, null);
whiteBallPhysics.velocity.set(0, 0, 0);

const spacingX = ballRadius * 2.05;
const spacingZ = ballRadius * 1.74;

spawnBall(0.0, -1.0, ballTexturesMap['01']);

spawnBall(-spacingX / 2, -1.0 - spacingZ, ballTexturesMap['02']);
spawnBall( spacingX / 2, -1.0 - spacingZ, ballTexturesMap['03']);

spawnBall(-spacingX, -1.0 - (spacingZ * 2), ballTexturesMap['04']);
spawnBall( 0.0,      -1.0 - (spacingZ * 2), ballTexturesMap['08']);
spawnBall( spacingX,  -1.0 - (spacingZ * 2), ballTexturesMap['05']);



// ==========================================================
// 7.5 إعداد لوحة التحكم الذكية (Control Panel)
// ==========================================================

const myShotSettings = {
    speed: 4.5,       
    topSpin: 15.0,    
    backSpin: 0.0,    
    sideSpin: 0.0,    
    dirX: 0.1,        
    dirZ: -1.0,
    restitution: 0.93, 

    currentSpeed: 0,
    currentAngularSpeed:0,
    currentPhase: 'idle',
    
    fireShot: function() {
        if (whiteBallPhysics.phase === 'idle' && !whiteBallPhysics.isPocketed) {
            console.log(" تم إطلاق الكرة البيضاء!");
            whiteBallPhysics.receiveShot(
                myShotSettings.speed,
                myShotSettings.topSpin,
                myShotSettings.backSpin,
                myShotSettings.sideSpin,
                myShotSettings.dirX,
                myShotSettings.dirZ
            );
        }
    },

    resetPocketedBalls: function() {
        physicalBalls.forEach((pBall, index) => {
            if (pBall.isPocketed) {
                pBall.isPocketed = false;
                pBall.phase = 'idle';
                pBall.fallingSpeedY = 0;
                pBall.velocity.set(0, 0, 0);
                pBall.angularVelocity.set(0, 0, 0);
                
                if (pBall.id === 0) {
                    pBall.position.set(0.0, 0, 1.5); 
                } else {
                    pBall.position.set((Math.random() - 0.5) * 0.5, 0, -1.0 - (Math.random() * 0.5)); 
                }
                
                if (visualBalls[index]) {
                    visualBalls[index].visible = true;
                    visualBalls[index].position.set(pBall.position.x, surfaceY + ballRadius, pBall.position.z);

                    scene.add(vBall);
                }
            }
        });
    }
};

// إنشاء اللوحة وتحديد محتواها
const gui = new GUI({ title: ' لوحة تحكم البلياردو' });

// المجلد الرابع: مراقبة المتغيرات لايف أثناء الحركة
const monitorFolder = gui.addFolder('📊 مراقبة حركة الكرة الحالية');
// إضافة الأدوات مع ميزة .listen() وجعلها للقراءة فقط باستخدام .disable()
monitorFolder.add(myShotSettings, 'currentSpeed').name('السرعة الخطية الحالية').listen().disable();
monitorFolder.add(myShotSettings, 'currentAngularSpeed').name('السرعة الزاوية (الدوران)').listen().disable();
monitorFolder.add(myShotSettings, 'currentPhase').name('حالة الكرة الحالية').listen().disable();

const shotFolder = gui.addFolder('إعدادات الضربة');
shotFolder.add(myShotSettings, 'speed', 1, 15, 0.1).name('السرعة (م/ث)');
shotFolder.add(myShotSettings, 'dirX', -1, 1, 0.05).name(' X الاتجاه ');
shotFolder.add(myShotSettings, 'dirZ', -1, 0, 0.05).name(' Z الاتجاه ');

const spinFolder = gui.addFolder('تأثيرات الدوران');
spinFolder.add(myShotSettings, 'topSpin', 0, 40, 1).name('TopSpin');
spinFolder.add(myShotSettings, 'backSpin', 0, 40, 1).name('BackSpin');
spinFolder.add(myShotSettings, 'sideSpin', -20, 20, 1).name('SideSpin');

const physicsFolder = gui.addFolder('فيزياء المحاكاة لايف');
physicsFolder.add(myShotSettings, 'restitution', 0.1, 1.0, 0.01)
    .name('(e)معامل الارتداد ')
    .onChange(value => 
         {
            module.RESTITUTION = value;
        });
    

gui.add(myShotSettings, 'fireShot').name(' إطلاق الكرة البيضاء');
gui.add(myShotSettings, 'resetPocketedBalls').name(' إعادة الكرات الساقطة');

window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        myShotSettings.fireShot();
    }
});

// 🎯 التحكم بمعطيات الضربة (عدّلي هذه الأرقام هنا فقط لتجربة تأثيرات مختلفة)
/*const myShotSettings = {
    speed: 4.5,       // السرعة الابتدائية (متر/ثانية) - يمكنكِ زيادتها أو إنقاصها
    topSpin: 15.0,    // الدوران الأمامي (أوميغا) - ضعي 0 إذا لم تريدي دوران
    backSpin: 0.0,    // الدوران الخلفي (أوميغا)
    sideSpin: 0.0,    // الدوران الجانبي
    dirX: 0.1,        // اتجاه الضربة على محور X (يمين/يسار)
    dirZ: -1.0        // اتجاه الضربة للأمام نحو الكرات
};

// ⌨️ الاستماع لـ زر المسافة (Spacebar) لإطلاق الكرة في أي وقت
window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        // التأكد أن الكرة واقفة حالياً لكي لا يتم ضربها وهي تتحرك
        if (whiteBallPhysics.phase === 'idle') {
            console.log("🚀 تم إطلاق الكرة البيضاء بالمعطيات المحددة!");

            whiteBallPhysics.receiveShot(
                myShotSettings.speed,
                myShotSettings.topSpin,
                myShotSettings.backSpin,
                myShotSettings.sideSpin,
                myShotSettings.dirX,
                myShotSettings.dirZ
            );
        }
    }
});*/
// ==========================================================
// 8. حلقة التحريك والرسم المتواصل
// ==========================================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    let dt = clock.getDelta();
    dt = Math.min(dt, 0.1);
    checkBallCollisions(physicalBalls);

    //الاسطر الثلاث للمراقبة
myShotSettings.currentSpeed = whiteBallPhysics.velocity.length();
myShotSettings.currentAngularSpeed = whiteBallPhysics.angularVelocity.length();
myShotSettings.currentPhase = whiteBallPhysics.phase;

    for (let i = 0; i < physicalBalls.length; i++) {
        const pBall = physicalBalls[i];
        const vBall = visualBalls[i];

        pBall.update(dt);
        checkTableBoundaries(pBall);

        if (vBall) {
            // تأثير السقوط التدريجي ثم الاختفاء الحازم من المشهد
            if (pBall.phase === 'POCKETED') {
                // الكائن الفيزيائي يقوم بإنقاص الصدارة العمودية في pBall.position.y لأسفل
                vBall.position.x = pBall.position.x;
                vBall.position.z = pBall.position.z;
                vBall.position.y = (surfaceY + ballRadius) + pBall.position.y;

                // إذا نزلت الكرة داخل الفوهة مسافة أكبر من قطرها، تختفي تماماً وتحذف من الذاكرة
                if (pBall.position.y < -(ballRadius * 2)) {
                    vBall.visible = false;
                    scene.remove(vBall);
                }
            } else {
                // الوضع الطبيعي فوق البساط الأخضر
                vBall.position.x = pBall.position.x;
                vBall.position.z = pBall.position.z;
                vBall.position.y = surfaceY + ballRadius;

                // حساب الدوران الحالي للكرة
                if (pBall.angularVelocity.length() > 0.001) {
                    const angle = pBall.angularVelocity.length() * dt;
                    const axis = pBall.angularVelocity.clone().normalize();
                    vBall.rotateOnWorldAxis(axis, angle);
                }
            }
        }
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});