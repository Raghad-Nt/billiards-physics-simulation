import * as THREE from 'three';

const STOP_THRESHOLD = 0.01;

export class PhysicalBall {
    constructor(id, initialX, initialZ) {
        this.id = id;

        // الثوابت المحدثة للكرة مكبّرة 2.5 مرة لتطابق الطاولة والرسوميات
        this.radius = 0.0285 * 2.5; // 0.07125 متر ليتناسق الرندر مع الفيزياء
        this.mass = 0.170;

        this.position = new THREE.Vector3(initialX, 0, initialZ);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.angularVelocity = new THREE.Vector3(0, 0, 0);

        this.dragCoefficient = 0.015;  // معامل مقاومة الهواء
        this.frictionCoefficient = 0.10; // معامل الاحتكاك
        this.inertia = 0.4 * this.mass * this.radius * this.radius; // عزم القصور الذاتي
        this.phase = 'idle';
    }

    // حساب قوة مقاومة الهواء
    computeDragForce() {
        return this.velocity.clone().multiplyScalar(-this.dragCoefficient);
    }

    // حساب قوة الاحتكاك Ff = -μmg
    computeFrictionForce() {
        if (this.velocity.length() === 0) {
            return new THREE.Vector3(0, 0, 0);
        }
        const gravity = 9.81;
        const frictionMagnitude = this.frictionCoefficient * this.mass * gravity;
        return this.velocity.clone().normalize().multiplyScalar(-frictionMagnitude);
    }

    // حساب القوة الكلية المؤثرة على الكرة F = Ff + Fd
    computeTotalForce() {
        const dragForce = this.computeDragForce();
        const frictionForce = this.computeFrictionForce();
        return dragForce.add(frictionForce);
    }

    // حساب العزم الناتج عن الاحتكاك τ = r × F
    computeTorque() {
        if (this.velocity.length() === 0) {
            return new THREE.Vector3(0, 0, 0);
        }
        const frictionForce = this.computeFrictionForce();
        const radiusVector = new THREE.Vector3(0, -this.radius, 0);
        return radiusVector.cross(frictionForce);
    }

    // دالة استقبال الضربات الابتدائية من مبرمج الكيو
    receiveShot(speed, topSpinOmega = 0, backSpinOmega = 0, sideSpin = 0, dirX = 0, dirZ = -1) {
        const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
        const nx = len > 0 ? dirX / len : 0;
        const nz = len > 0 ? dirZ / len : -1;
        this.velocity.set(nx * speed, 0, nz * speed);

        this.angularVelocity.set(0, 0, 0);

        // تفعيل الـ Top-Spin
        if (topSpinOmega > 0) {
            this.angularVelocity.x += -nz * topSpinOmega;
            this.angularVelocity.z += nx * topSpinOmega;
            this.phase = 'top-spin-sliding';
        }
        // تفعيل الـ Back-Spin
        if (backSpinOmega > 0) {
            this.angularVelocity.x += nz * backSpinOmega;
            this.angularVelocity.z += -nx * backSpinOmega;
            this.phase = 'back-spin-sliding';
        }
        // تفعيل الـ Side-Spin (English) حول المحور الرأسي Y
        if (sideSpin !== 0) {
            this.angularVelocity.y = sideSpin;
        }
        if (topSpinOmega === 0 && backSpinOmega === 0) {
            this.phase = 'back-spin-sliding';
        }
        
        this.angularVelocity.y = sideSpin; // إسناد الدوران الجانبي لمحور Y

       // إضافة تأثير الـ Squirt الانحرافي الفوري (عكس اتجاه الدوران)
       if (Math.abs(sideSpin) > 0.01) {
       // حساب متجه عمودي خفيف بناءً على اتجاه الحركة الابتدائي لحرف الكرة
       this.velocity.x -= this.velocity.z * (sideSpin * 0.05);
       this.velocity.z += this.velocity.x * (sideSpin * 0.05);
       } 
    
    }

    // دالة التحديث الحركي المتجهي العادية
    update(dt) {
    
        if (this.velocity.x === 0 && this.velocity.z === 0) {
            return;
        }

        const totalForce = this.computeTotalForce();
        const acceleration = totalForce.clone().divideScalar(this.mass);
        this.velocity.add(acceleration.multiplyScalar(dt));

        // --- كود المبرمج الفيزيائي 7: تطبيق الـ Swerve ---
        let currentSpeed = this.velocity.length();
        if (currentSpeed > 0.01 && Math.abs(this.angularVelocity.y) > 0.01) {
            const frictionCoeff = 0.02; // احتكاك الطاولة
            const gravity = 9.81;

            // حساب المتجه العمودي على اتجاه الحركة الحالي لإنتاج الانحناء الفعلي (Curve)
            const perpX = -this.velocity.z / currentSpeed;
            const perpZ = this.velocity.x / currentSpeed;

            // تسارع الانحناء الناتج عن تفاعل الدوران الجانبي مع الطاولة
            const swerveAccel = this.angularVelocity.y * frictionCoeff * gravity * 0.5;

            // تعديل مركبات السرعة الخطية مباشرة بناءً على الدوران الجانبي
            this.velocity.x += perpX * swerveAccel * dt;
            this.velocity.z += perpZ * swerveAccel * dt;

            // تلاشي وتخفيف الدوران الجانبي تدريجياً بسبب الاحتكاك مع القماش
            const spinDecay = 0.95 * dt;
            if (this.angularVelocity.y > 0) {
                this.angularVelocity.y = Math.max(0, this.angularVelocity.y - spinDecay);
            } else {
                this.angularVelocity.y = Math.min(0, this.angularVelocity.y + spinDecay);
            }
        }
        

        const torque = this.computeTorque();
        const angularAcceleration = torque.clone().divideScalar(this.inertia);
        this.angularVelocity.add(angularAcceleration.multiplyScalar(dt));

        let newSpeed = this.velocity.length();

        if (newSpeed <= STOP_THRESHOLD) {
            this.velocity.set(0, 0, 0);
            this.angularVelocity.set(0, 0, 0);
            this.phase = 'idle';
            console.log(`[STOP] Ball ID: ${this.id} stopped.`);
        } else {
            this.position.x += this.velocity.x * dt;
            this.position.z += this.velocity.z * dt;
        }
    }
}    

// دالة معالجة الاصطدام المائل غير المرن التام بناءً على تكليفات المبرمج الفيزيائي 8
export function handleBallBallCollision(ball1, ball2) {
    // 1. حساب المسافة بين مركزي الكرتين
    const delta = ball2.position.clone().sub(ball1.position);
    delta.y = 0; // تصفير مركبة Y لأن الحركة مستوية على الطاولة
    
    const distance = delta.length();
    const minDistance = ball1.radius + ball2.radius;

    // التحقق من حدوث تلامس أو تداخل بين الكرتين
    if (distance >= minDistance || distance === 0) {
        return; // لا يوجد تصادم
    }

    // منع تداخل الكرات (Positional Correction)
    const overlap = minDistance - distance;
    const separationVector = delta.clone().normalize().multiplyScalar(overlap * 0.5);
    ball1.position.sub(separationVector);
    ball2.position.add(separationVector);

    // 2. تحديد المحاور المحلية لحظة التلامس (المحور الناظمي والمحور المماسي)
    const normal = delta.clone().normalize(); // المحور الناظمي (n) المار بالمركزين
    const tangent = new THREE.Vector3(-normal.z, 0, normal.x); // المحور المماسي (t) العمودي عليه

    // 3. نقل السرعات الخطية من المحاور العالمية (Global) إلى المحاور المحلية (Local)
    const v1n = ball1.velocity.dot(normal);
    const v1t = ball1.velocity.dot(tangent);
    const v2n = ball2.velocity.dot(normal);
    const v2t = ball2.velocity.dot(tangent);

    // تجنب الحسابات المتكررة إذا كانت الكرات تبتعد بالفعل عن بعضها
    if (v1n - v2n < 0) {
        return; 
    }

    // 4. تطبيق القوانين الحاكمة للمبرمج الفيزيائي 8 (e = 0.93) للسرعات الناظمية الجديدة
    let v1n_prime = 0.035 * v1n;
    let v2n_prime = 0.965 * v1n;

    // إذا كانت الكرة الثانية متحركة قبل الصدم، نطبق النموذج النسبي العام:
    if (Math.abs(v2n) > 0.01) {
        const e = 0.93; // معامل الاسترداد الحقيقي للكرات
        v1n_prime = 0.5 * ((1 - e) * v1n + (1 + e) * v2n);
        v2n_prime = 0.5 * ((1 + e) * v1n + (1 - e) * v2n);
    }

    // 5. حساب الاحتكاك السطحي المماسي النبضي (Tangential Impulse) وتأثير التعشيق الترسي (Gearing Effect)
    const mu_ball = 0.05; // معامل الاحتكاك السطحي المتبادل بين الكرات
    
    // السرعة المماسية النسبية عند نقطة التلامس مع أخذ الدوران الرأسي Y بعين الاعتبار
    const relativeTangentVelocity = (v1t - ball1.radius * ball1.angularVelocity.y) - 
                                    (v2t + ball2.radius * ball2.angularVelocity.y);

    let v1t_prime = v1t;
    let v2t_prime = v2t;

    if (Math.abs(relativeTangentVelocity) > 0.01) {
        const normalImpulse = Math.abs(v1n_prime - v1n);
        const maxTangentialImpulse = normalImpulse * mu_ball;
        
        const frictionDirection = Math.sign(relativeTangentVelocity);
        v1t_prime -= frictionDirection * maxTangentialImpulse * 0.4; // تنقص السرعة المماسية للأولى
        v2t_prime += frictionDirection * maxTangentialImpulse * 0.4; // تكتسب الثانية سرعة مماسية خفيفة (انحراف الزاوية)

        // توليد الدوران العكسي المتبادل الناتج عن التعشيق الترسي لحظة الصدم
        const spinChange = (maxTangentialImpulse / ball1.radius) * 0.5;
        ball1.angularVelocity.y += frictionDirection * spinChange;
        ball2.angularVelocity.y -= frictionDirection * spinChange;
    }

    // 6. إعادة تحويل السرعات المحلية الجديدة إلى المتجهات العالمية (Global Vectors)
    ball1.velocity.set(
        normal.x * v1n_prime + tangent.x * v1t_prime,
        0,
        normal.z * v1n_prime + tangent.z * v1t_prime
    );

    ball2.velocity.set(
        normal.x * v2n_prime + tangent.x * v2t_prime,
        0,
        normal.z * v2n_prime + tangent.z * v2t_prime
    );

    // تحديث أطوار الحركة
    ball1.phase = 'back-spin-sliding';
    ball2.phase = 'top-spin-sliding';
}