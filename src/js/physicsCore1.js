import * as THREE from 'three';

// ==========================================
// 1. الثوابت الفيزيائية (تعريف الثوابت وقيمة حد التوقف)
// ==========================================
const FRICTION_DECELERATION = 0.15; // التباطؤ الثابت ناتج عن الاحتكاك الحركي (0.1 * 9.8)
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
    }

    // ==========================================
    // 3. دالة التحديث الحركي العادية
    // ==========================================
    update(dt) {
        // الحالة الأولى: إذا كانت مركبات السرعة صفراً، الكرة مستقرة تماماً
        if (this.velocity.x === 0 && this.velocity.z === 0) {
            return;
        }

        // الحالة الثانية: الكرة تتحرك (حساب مقدار السرعة الحالية "المحصلة")
        // دالة length() تحسب قانون فيثاغورس والجذر تلقائياً للمتجه
        let currentSpeed = this.velocity.length();

        // حساب السرعة الجديدة بعد طرح تباطؤ الاحتكاك عبر الزمن
        let newSpeed = currentSpeed - (FRICTION_DECELERATION * dt);

        // الحالة الثالثة: معالجة التوقف التام عند حد التوقف الأدنى
        if (newSpeed <= STOP_THRESHOLD || newSpeed < 0) {
            this.velocity.set(0, 0, 0); // تصفير المتجه بالكامل
            console.log(`[STOP] Ball ID: ${this.id} stopped at -> X: ${this.position.x.toFixed(2)}, Z: ${this.position.z.toFixed(2)}`);
        } else {
            // إذا كانت الكرة لا تزال تتحرك:

            // حساب نسبة التباطؤ الحالية (السرعة الجديدة مقسومة على القديمة)
            let decelerationRatio = newSpeed / currentSpeed;

            // تحديث مركبات السرعة بضربها مباشرة في نسبة التباطؤ (فيزياء عادية جداً ومباشرة)
            this.velocity.x = this.velocity.x * decelerationRatio;
            this.velocity.z = this.velocity.z * decelerationRatio;

            // تحديث الموقع: الإحداثي الجديد = الإحداثي القديم + (السرعة * الزمن)
            this.position.x = this.position.x + (this.velocity.x * dt);
            this.position.z = this.position.z + (this.velocity.z * dt);

            console.log(`[MOTION] Ball ID: ${this.id} | Speed: ${newSpeed.toFixed(3)} m/s | Position -> X: ${this.position.x.toFixed(2)}, Z: ${this.position.z.toFixed(2)}`);
        }
    }
}