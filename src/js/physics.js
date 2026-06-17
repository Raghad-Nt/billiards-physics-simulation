// داخل ملف physics.js
const BALL_RADIUS = 0.05; 
const TABLE_LIMIT_X = 1.27;
const TABLE_LIMIT_Z = 2.6;
const BOUNCE_COEFFICIENT = 0.8; 

export function checkTableBoundaries(pBall) {
    // التحقق من الحدود بناءً على الموضع الفيزيائي pBall.position
    const maxX = TABLE_LIMIT_X - BALL_RADIUS;
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