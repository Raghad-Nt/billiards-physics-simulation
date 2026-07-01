import * as THREE from 'three';

// ==========================================
// 1. الثوابت الفيزيائية (تعريف الثوابت وقيمة حد التوقف)
// ==========================================
//const FRICTION_DECELERATION = 0.9; // التباطؤ الثابت ناتج عن الاحتكاك الحركي (0.1 * 9.8)
const STOP_THRESHOLD = 0.01;       // حد السرعة الأدنى (1 سم/ث) الذي نوقف عنده الكرة تماماً

// ==========================================
// 2. هيكل الكرة الفيزيائية
// ==========================================
export class PhysicalBall {
    constructor(id, initialX, initialZ) {
        this.id = id;

        // الثوابت القياسية للكرة
        this.radius = 0.0285; // نصف القطر = 0.0285 متر
        this.mass = 0.170;    // الكتلة = 0.170 كيلوغرام

        // استخدام كائن المتجهات من مكتبة الرسوميات لتخزين محاور الحركة (Y دائماً صفر)
        this.position = new THREE.Vector3(initialX, 0, initialZ);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.angularVelocity=new THREE.Vector3(0,0,0)//سرعة زاوية
        this.dragCoefficient=0.015;//معامل مقاومة الهواء
        this.frictionCoefficient=0.10;//معامل الاحتكاك
        this.inertia=0.4*this.mass*this.radius*this.radius;//عزم القصور الذاتي


    }
    //حساب قوة مقاومة الهواء
    computeDragForce(){
        return this.velocity.clone().multiplyScalar(-this.dragCoefficient);
    }

    // ==========================================
// حساب قوة الاحتكاك
// Ff = -μmg
// ==========================================
computeFrictionForce() {

    // إذا كانت الكرة متوقفة فلا يوجد احتكاك
    if (this.velocity.length() === 0) {
        return new THREE.Vector3(0, 0, 0);
    }

    const gravity = 9.81;

    const frictionMagnitude =
        this.frictionCoefficient *
        this.mass *
        gravity;

    return this.velocity
        .clone()
        .normalize()
        .multiplyScalar(-frictionMagnitude);
}

// ==========================================
// حساب القوة الكلية المؤثرة على الكرة
// F = Ff + Fd
// ==========================================
computeTotalForce() {

    const dragForce = this.computeDragForce();

    const frictionForce = this.computeFrictionForce();

    return dragForce.add(frictionForce);

}
// ==========================================
// حساب العزم الناتج عن الاحتكاك
// τ = r × F
// ==========================================
computeTorque() {

    // إذا كانت الكرة متوقفة فلا يوجد عزم
    if (this.velocity.length() === 0) {
        return new THREE.Vector3(0, 0, 0);
    }

    // قوة الاحتكاك
    const frictionForce = this.computeFrictionForce();

    // متجه من مركز الكرة إلى نقطة التماس مع الطاولة
    const radiusVector = new THREE.Vector3(0, -this.radius, 0);

    // العزم = r × F
    return radiusVector.cross(frictionForce);
}

    // ==========================================
    // 3. دالة التحديث الحركي العادية
    // ==========================================
update(dt) {

    // إذا كانت الكرة متوقفة لا داعي للحساب
    if (this.velocity.x === 0 && this.velocity.z === 0) {
        return;
    }

    // حساب القوة الكلية
    const totalForce = this.computeTotalForce();

    // حساب التسارع
    const acceleration = totalForce.clone().divideScalar(this.mass);

    // تحديث السرعة
    this.velocity.add(
        acceleration.multiplyScalar(dt)
    );
    // ==========================================
// حساب العزم
// ==========================================
const torque = this.computeTorque();

// حساب التسارع الزاوي α = τ / I
const angularAcceleration = torque.clone().divideScalar(this.inertia);

// تحديث السرعة الزاوية
this.angularVelocity.add(
    angularAcceleration.multiplyScalar(dt)
);

    // إذا أصبحت السرعة صغيرة جداً نوقف الكرة
    if (this.velocity.length() < STOP_THRESHOLD) {
        this.velocity.set(0, 0, 0);
    }

    // حساب مقدار السرعة الجديدة
    let newSpeed = this.velocity.length();

    // معالجة التوقف
    if (newSpeed <= STOP_THRESHOLD) {

        this.velocity.set(0, 0, 0);
        
      console.log(`[STOP] Ball ID: ${this.id} stopped at -> X: ${this.position.x.toFixed(2)}, Z: ${this.position.z.toFixed(2)}`);

        
    } else {

        // تحديث الموقع
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
console.log(`[MOTION] Ball ID: ${this.id} | Speed: ${newSpeed.toFixed(3)} m/s | Position -> X: ${this.position.x.toFixed(2)}, Z: ${this.position.z.toFixed(2)}`);

    }
}
}