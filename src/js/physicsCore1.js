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
    }

    // دالة التحديث الحركي المتجهي العادية
    update(dt) {
        if (this.velocity.x === 0 && this.velocity.z === 0) {
            return;
        }

        const totalForce = this.computeTotalForce();
        const acceleration = totalForce.clone().divideScalar(this.mass);
        this.velocity.add(acceleration.multiplyScalar(dt));

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