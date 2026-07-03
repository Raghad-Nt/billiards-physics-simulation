export const RESTITUTION = 0.93;
export const SURFACE_FRICTION = 0.06;
export const BALL_DIAMETER = 0.057 * 2.5; // تعديل القطر ليصبح 0.1425 متر متوافقاً مع حجم الرسوميات الجديد
/**
 * يفكك متجه السرعة لكرة معينة إلى مركبتين: ناظمية (n) ومماسية (t)
 * @returns {{vn: number, vt: number}}
 */
export function decomposeVelocity(velocity, nx, nz, tx, tz) {
    return {
        vn: velocity.x * nx + velocity.z * nz,
        vt: velocity.x * tx + velocity.z * tz,
    };
}

/**
 * يعيد تركيب السرعة من المركبتين المحليتين (n, t) إلى المحاور العالمية (X, Z)
 */
export function recomposeVelocity(vn, vt, nx, nz, tx, tz) {
    return {
        x: vn * nx + vt * tx,
        z: vn * nz + vt * tz,
    };
}

/**
 * يحل تصادم مائل كامل بين كرتين:
 * 1. يحسب المحورين n̂ و t̂
 * 2. يفكك السرعتين إلى مركبات n/t
 * 3. يطبق نسب الفقد (0.035 / 0.965) المشتقة من معامل الاسترداد e=0.93 على المحور الناظمي
 * 4. يطبق كبح مماسي ناتج عن الاحتكاك السطحي بين الكرات (يفسر زاوية الافتراق != 90°)
 * 5. يعيد تحويل المتجهات النهائية إلى المحاور العالمية
 */
export function resolveCollision(ballA, ballB) {
    const dx = ballB.position.x - ballA.position.x;
    const dz = ballB.position.z - ballA.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance === 0) return; // كرتان متطابقتا الموضع، تجنب القسمة على صفر

    // 1) المحور الناظمي n̂ (خط المراكز - line of centers)
    const nx = dx / distance;
    const nz = dz / distance;

    // 2) المحور المماسي t̂ (عمودي على n̂)
    const tx = -nz;
    const tz = nx;

    // 3) تفكيك سرعتي الكرتين على المحاور المحلية
    const A = decomposeVelocity(ballA.velocity, nx, nz, tx, tz);
    const B = decomposeVelocity(ballB.velocity, nx, nz, tx, tz);

    // لا نطبق حل تصادم إلا إذا كانت الكرتان تقتربان فعلياً من بعضهما على المحور الناظمي
    const approachSpeed = A.vn - B.vn;
    if (approachSpeed <= 0) return; // الكرتان مبتعدتان أو ساكنتان نسبياً، لا تصادم فعلي

    // 4) معادلات السرعة الناظمية الجديدة (افتراض تساوي الكتل m1=m2)
    // v'1n = [(1-e)/2]*v1n + [(1+e)/2]*v2n   => النسب 0.035 و 0.965 عند v2n=0
    // v'2n = [(1+e)/2]*v1n + [(1-e)/2]*v2n
    const lossFactor = (1 - RESTITUTION) / 2;       // = 0.035
    const transferFactor = (1 + RESTITUTION) / 2;   // = 0.965

    const newA_n = lossFactor * A.vn + transferFactor * B.vn;
    const newB_n = transferFactor * A.vn + lossFactor * B.vn;

    // 5) الكبح المماسي (Tangential Impulse) بسبب الاحتكاك السطحي بين الكرتين
    // في الحالة المثالية بدون احتكاك: vt تبقى محفوظة تماماً (انحراف 90° قائم)
    // هنا نطبق كبح متناسب مع شدة الصدمة الناظمية ليعكس انحراف زاوية الافتراق عن 90°
    const relativeTangentSpeed = A.vt - B.vt;
    const tangentialImpulse = SURFACE_FRICTION * approachSpeed * Math.sign(relativeTangentSpeed || 1);

    let newA_t = A.vt - tangentialImpulse;
    // الكرة الثانية تكتسب جزءاً بسيطاً من السرعة المماسية (Throw effect) + دوران مقابل (Gearing effect)
    let newB_t = B.vt + tangentialImpulse * 0.3;

    // نقل جزء من الزخم الزاوي بسبب التعشيق الترسي (gearing) - تبسيط: نربطه بالكبح المماسي
    ballA.angularVelocity.y -= tangentialImpulse * 2.0;
    ballB.angularVelocity.y += tangentialImpulse * 2.0;

    // 6) إعادة التركيب إلى المحاور العالمية
    const finalA = recomposeVelocity(newA_n, newA_t, nx, nz, tx, tz);
    const finalB = recomposeVelocity(newB_n, newB_t, nx, nz, tx, tz);

    ballA.velocity.x = finalA.x;
    ballA.velocity.z = finalA.z;
    ballB.velocity.x = finalB.x;
    ballB.velocity.z = finalB.z;

    // 7) تصحيح الموضع لمنع تراكب الكرتين (Position Correction / Separation)
    const overlap = BALL_DIAMETER - distance;
    if (overlap > 0) {
        const correctionX = (overlap / 2) * nx;
        const correctionZ = (overlap / 2) * nz;
        ballA.position.x -= correctionX;
        ballA.position.z -= correctionZ;
        ballB.position.x += correctionX;
        ballB.position.z += correctionZ;
    }
     // --- كود المبرمج الفيزيائي 7: تطبيق الـ Throw عند التصادم ---
    if (Math.abs(ballA.angularVelocity.y) > 0.01 || Math.abs(ballB.angularVelocity.y) > 0.01) {
        // حساب فرق المسافة بين الكرتين
        let dx = ballA.position.x - ballB.position.x;
        let dz = ballA.position.z - ballB.position.z;
        let distance = Math.sqrt(dx * dx + dz * dz);

        if (distance > 0) {
            // المتجه المماسي (Tangent) لنقطة التصادم
            let tangentX = -(dz / distance);
            let tangentZ = dx / distance;

            // تأثير الكرة A على الكرة B (إذا كانت A تدور جانيباً)
            if (Math.abs(ballA.angularVelocity.y) > 0.01) {
                let throwAmountA = ballA.angularVelocity.y * 0.04; // معامل نقل طاقة الدوران الجانبي
                ballB.velocity.x += tangentX * throwAmountA;
                ballB.velocity.z += tangentZ * throwAmountA;
                
                // رد فعل معاكس على الكرة البيضاء لإضعافها أو حرفها قليلاً
                ballA.velocity.x -= tangentX * throwAmountA * 0.5;
                ballA.velocity.z -= tangentZ * throwAmountA * 0.5;
            }

            // تأثير الكرة B على الكرة A (إذا كانت B هي التي تدور)
            if (Math.abs(ballB.angularVelocity.y) > 0.01) {
                let throwAmountB = ballB.angularVelocity.y * 0.04;
                ballA.velocity.x -= tangentX * throwAmountB;
                ballA.velocity.z -= tangentZ * throwAmountB;
                
                ballB.velocity.x += tangentX * throwAmountB * 0.5;
                ballB.velocity.z += tangentZ * throwAmountB * 0.5;
            }
        }
    }
      // --- كود المبرمج الفيزيائي 7: تطبيق الـ Throw عند التصادم ---
    if (Math.abs(ballA.angularVelocity.y) > 0.01 || Math.abs(ballB.angularVelocity.y) > 0.01) {
        // حساب فرق المسافة بين الكرتين
        let dx = ballA.position.x - ballB.position.x;
        let dz = ballA.position.z - ballB.position.z;
        let distance = Math.sqrt(dx * dx + dz * dz);

        if (distance > 0) {
            // المتجه المماسي (Tangent) لنقطة التصادم
            let tangentX = -(dz / distance);
            let tangentZ = dx / distance;

            // تأثير الكرة A على الكرة B (إذا كانت A تدور جانيباً)
            if (Math.abs(ballA.angularVelocity.y) > 0.01) {
                let throwAmountA = ballA.angularVelocity.y * 0.04; // معامل نقل طاقة الدوران الجانبي
                ballB.velocity.x += tangentX * throwAmountA;
                ballB.velocity.z += tangentZ * throwAmountA;
                
                // رد فعل معاكس على الكرة البيضاء لإضعافها أو حرفها قليلاً
                ballA.velocity.x -= tangentX * throwAmountA * 0.5;
                ballA.velocity.z -= tangentZ * throwAmountA * 0.5;
            }

            // تأثير الكرة B على الكرة A (إذا كانت B هي التي تدور)
            if (Math.abs(ballB.angularVelocity.y) > 0.01) {
                let throwAmountB = ballB.angularVelocity.y * 0.04;
                ballA.velocity.x -= tangentX * throwAmountB;
                ballA.velocity.z -= tangentZ * throwAmountB;
                
                ballB.velocity.x += tangentX * throwAmountB * 0.5;
                ballB.velocity.z += tangentZ * throwAmountB * 0.5;
            }
        }
    }
    
      
}