import { resolveCollision } from './resolveCollision.js';

// تحديث الثوابت لتتوافق تماماً مع أبعاد الطاولة والكرات المكبرة 2.5 مرة
const BALL_RADIUS = 0.0285 * 2.5; // 0.07125 متر
const TABLE_LIMIT_X = 1.27 * 2.5; // الحدود متطابقة مع الرسوميات
const TABLE_LIMIT_Z = 2.54 * 2.5 / 2; // نصف طول الطاولة من المركز

const BOUNCE_COEFFICIENT = 0.8;

export function checkTableBoundaries(pBall) {
    const maxX = TABLE_LIMIT_X / 2 - BALL_RADIUS;
    const maxZ = TABLE_LIMIT_Z - BALL_RADIUS;

    // محور X
    if (pBall.position.x > maxX) {
        pBall.position.x = maxX;
        pBall.velocity.x = -pBall.velocity.x * BOUNCE_COEFFICIENT;
    } else if (pBall.position.x < -maxX) {
        pBall.position.x = -maxX;
        pBall.velocity.x = -pBall.velocity.x * BOUNCE_COEFFICIENT;
    }

    // محور Z
    if (pBall.position.z > maxZ) {
        pBall.position.z = maxZ;
        pBall.velocity.z = -pBall.velocity.z * BOUNCE_COEFFICIENT;
    } else if (pBall.position.z < -maxZ) {
        pBall.position.z = -maxZ;
        pBall.velocity.z = -pBall.velocity.z * BOUNCE_COEFFICIENT;
    }
}

export function checkBallCollisions(physicalBalls) {
    const BALL_DIAMETER = BALL_RADIUS * 2; // 0.1425 متر الحجم الفعلي

    for (let i = 0; i < physicalBalls.length; i++) {
        for (let j = i + 1; j < physicalBalls.length; j++) {
            let ballA = physicalBalls[i];
            let ballB = physicalBalls[j];

            let dx = ballA.position.x - ballB.position.x;
            let dz = ballA.position.z - ballB.position.z;
            let distance = Math.sqrt(dx * dx + dz * dz);

            // تفعيل حل التصادم المائل الحقيقي بدلاً من مجرد الطباعة
            if (distance < BALL_DIAMETER) {
                console.log(`[Collision] Between Ball ${ballA.id} and Ball ${ballB.id}`);
                resolveCollision(ballA, ballB);
            }
        }
    }
}