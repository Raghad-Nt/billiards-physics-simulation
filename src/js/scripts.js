import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PhysicalBall } from './physicsCore1.js';
import { checkTableBoundaries ,checkBallCollisions} from './physics.js';


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
        color: 0x301b0f, // لون خشبي متناسق
        roughness: 0.35
    });
    const cushion = new THREE.Mesh(geo, mat);
    // رفع الحافة لتشكل جداراً حقيقياً يرتفع فوق البساط
    cushion.position.set(x, surfaceY + h/2, z);
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    tableGroup.add(cushion);
}
// زيادة الارتفاع (h) إلى 15 سم لتمثل جداراً صلباً أمام الكرات
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
const pocketRadius = 0.13; // نصف قطر مثالي ومكبر ليتسع للكرات
const pocketDepth = 0.20;  // عمق الحفرة (20 سم لتهبط الكرات بداخلها وتختفي عن السطح)

function createPocket(x, z) {
    // إنشاء أسطوانة مجوفة ثلاثية أبعاد لتمثيل بئر الثقب
    const pocketGeo = new THREE.CylinderGeometry(pocketRadius, pocketRadius, pocketDepth, 32, 1, false);
    const pocketMat = new THREE.MeshBasicMaterial({
        color: 0x020202 // أسود مطلق ومطفي ليوحي بعمق سحيق ومظلم
    });
    const pocket = new THREE.Mesh(pocketGeo, pocketMat);

    // ندفن نصف الأسطوانة داخل سطح البساط لتبدو كحفرة حقيقية غائرة لأسفل
    pocket.position.set(x, surfaceY - (pocketDepth / 2) + 0.005, z);
    tableGroup.add(pocket);
}

// توزيع الثقوب الستة الحقيقية عند الزوايا والمنتصفين بدقة هندسية مريحة
const pX = tableWidth / 2 - 0.02;
const pZ = tableLength / 2 - 0.02;
createPocket(pX, pZ);     // زاوية أمامية يمنى
createPocket(-pX, pZ);    // زاوية أمامية يسرى
createPocket(pX, -pZ);    // زاوية خلفية يمنى
createPocket(-pX, -pZ);   // زاوية خلفية يسرى
createPocket(tableWidth / 2, 0);  // الثقب الأوسط الأيمن
createPocket(-tableWidth / 2, 0); // الثقب الأوسط الأيسر

scene.add(tableGroup);

// ==========================================================
// 6. دالة إنشاء الكرات المكبرة (1 فيزياء = 1 رسم)
// ==========================================================
let ballIdCounter = 0;
const ballRadius = 0.0285 * 2.5; // نصف قطر الكرات الضخمة المتناسقة مع الأبعاد الجديدة

function spawnBall(x, z, textureUrl = null) {
    const geometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    let material;

    if (textureUrl) {
        const texture = textureLoader.load(textureUrl);
        texture.colorSpace = THREE.SRGBColorSpace;
        material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.1 });
    } else {
        material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 }); // الكرة البيضاء
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // تصفير الموضع فوق البساط الأخضر بدقة
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

// إنشاء الكرة البيضاء مع سرعة ابتدائية قوية للاختبار الحركي البصري
const whiteBallPhysics = spawnBall(0.0, 1.5, null);
whiteBallPhysics.velocity.set(0, 0, -1.2);

// رصف مثلث الكرات الملونة الـ 15 المكسوة بصور الخامات الخاصة بكِ
const spacingX = ballRadius * 2.05;
const spacingZ = ballRadius * 1.74;

spawnBall(0.0, -1.0, ballTexturesMap['01']); // رأس المثلث

spawnBall(-spacingX / 2, -1.0 - spacingZ, ballTexturesMap['02']); // الصف الثاني
spawnBall( spacingX / 2, -1.0 - spacingZ, ballTexturesMap['03']);

spawnBall(-spacingX, -1.0 - (spacingZ * 2), ballTexturesMap['04']); // الصف الثالث
spawnBall( 0.0,      -1.0 - (spacingZ * 2), ballTexturesMap['08']); // كرة رقم 8 السوداء بالمنتصف
spawnBall( spacingX,  -1.0 - (spacingZ * 2), ballTexturesMap['05']);

// ==========================================================
// 8. حلقة التحريك والرسم المتواصل (مع حساب الدوران التلقائي)
// ==========================================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    let dt = clock.getDelta();
    dt = Math.min(dt, 0.1);
    checkBallCollisions(physicalBalls);

    for (let i = 0; i < physicalBalls.length; i++) {
        const pBall = physicalBalls[i];
        const vBall = visualBalls[i];

       pBall.update(dt);

        pBall.velocity.x * dt;
    pBall.position.z += pBall.velocity.z * dt;

        checkTableBoundaries(pBall);

        if (vBall) {
            vBall.position.x = pBall.position.x;
            vBall.position.z = pBall.position.z;
            vBall.position.y = surfaceY + ballRadius; // الحفاظ على منسوب دحرجة ثابت فوق البساط

            // دوران بصري مذهل وواقعي جداً للصور أثناء دحرجة الكرة
            if (pBall.velocity.length() > 0.01) {
                const distanceMoved = pBall.velocity.length() * dt;
                const angle = distanceMoved / ballRadius;
                const axis = new THREE.Vector3(-pBall.velocity.z, 0, pBall.velocity.x).normalize();
                vBall.rotateOnWorldAxis(axis, angle);
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