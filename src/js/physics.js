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
// =================================================================
// المبرمج الفيزيائي 3: كشف الاصطدام بين الكرات (آية)
// =================================================================
export function checkBallCollisions(physicalBalls) {
    // حلقة دوران مزدوجة للمقارنة بين كل كرتين بدون تكرار
    for (let i = 0; i < physicalBalls.length; i++) {
        for (let j = i + 1; j < physicalBalls.length; j++) {
            let ballA = physicalBalls[i];
            let ballB = physicalBalls[j];

            // 1. حساب فرق المسافة على المحورين الأفقيين X و Z
            let dx = ballA.position.x - ballB.position.x;
            let dz = ballA.position.z - ballB.position.z;

            // 2. تطبيق قانون المسافة (فيثاغورث) بين مركزي الكرتين
            let distance = Math.sqrt(dx * dx + dz * dz);

            // 3. شرط التصادم: إذا كانت المسافة أقل من مجموع قطري الكرتين (0.057)
            if (distance < 0.057) {
                // الرادار التقط التصادم بنجاح! طباعة في الـ Console للتأكد
            console.log("[Radar] Collision detected between balls!");
                
                // هنا سيقوم المبرمج الرابع (رد فعل الاصطدام) بوضع دالته لاحقاً
                // if (typeof handleBallCollisionResponse === "function") {
                //     handleBallCollisionResponse(ballA, ballB);
                // }
            }
        }
    }
}