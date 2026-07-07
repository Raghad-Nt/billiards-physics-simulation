import * as THREE from 'three';

const STOP_THRESHOLD = 0.05; // رفع الحد قليلاً لضمان التوقف الحازم والواقعي

export class PhysicalBall {
    constructor(id, initialX, initialZ) {
        this.id = id;
        this.radius = 0.0285 * 2.5;
        this.mass = 0.170;

        this.position = new THREE.Vector3(initialX, 0, initialZ);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.angularVelocity = new THREE.Vector3(0, 0, 0);

        this.dragCoefficient = 0.015;
        this.frictionCoefficient = 0.15;  // رفع الاحتكاك الحركي قليلاً للسرعة والتوقف الواقعي
        this.rollingFrictionCoefficient = 0.02; // احتكاك التدحرج

        this.inertia = 0.4 * this.mass * this.radius * this.radius;

        this.phase = 'idle';
        this.t_sliding = 0;
        this.t_rolling_limit = 0;

        // حالات السقوط في الثقوب
        this.isPocketed = false;
        this.fallingSpeedY = 0;
    }

    calculateRollingTime(v0, omega0) {
        const g = 9.81;
        const mu_k = this.frictionCoefficient;
        const m = this.mass;
        const c = this.dragCoefficient;
        const r = this.radius;

        const f = (t) => {
            return (v0 + (m * mu_k * g) / c) * Math.exp((-c * t) / m) - (m * mu_k * g) / c - r * omega0 - 2.5 * mu_k * g * t;
        };

        const df = (t) => {
            return -(c / m) * (v0 + (m * mu_k * g) / c) * Math.exp((-c * t) / m) - 2.5 * mu_k * g;
        };

        let t = 0.1;
        for (let i = 0; i < 15; i++) {
            let ft = f(t);
            let dft = df(t);
            if (Math.abs(dft) < 1e-6) break;
            let nextT = t - ft / dft;
            if (nextT < 0 || nextT > 5) {
                t = (2 * (v0 - r * omega0)) / (7 * mu_k * g);
                break;
            }
            if (Math.abs(nextT - t) < 0.001) { t = nextT; break; }
            t = nextT;
        }
        return Math.max(0, t);
    }

    receiveShot(speed, topSpinOmega = 0, backSpinOmega = 0, sideSpin = 0, dirX = 0, dirZ = -1) {
        if (this.isPocketed) return; // لا تستقبل ضربات إذا سقطت

        const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
        const nx = len > 0 ? dirX / len : 0;
        const nz = len > 0 ? dirZ / len : -1;

        this.velocity.set(nx * speed, 0, nz * speed);
        this.angularVelocity.set(0, 0, 0);

        let omega0 = 0;
        if (topSpinOmega > 0) {
            this.angularVelocity.x = -nz * topSpinOmega;
            this.angularVelocity.z = nx * topSpinOmega;
            omega0 = topSpinOmega;
        } else if (backSpinOmega > 0) {
            this.angularVelocity.x = nz * backSpinOmega;
            this.angularVelocity.z = -nx * backSpinOmega;
            omega0 = -backSpinOmega;
        }

        if (sideSpin !== 0) this.angularVelocity.y = sideSpin;

        this.t_sliding = 0;
        this.t_rolling_limit = this.calculateRollingTime(speed, omega0);
        this.phase = this.t_rolling_limit > 0 ? 'SLIDING' : 'ROLLING';
    }

    computeDragForce() {
        return this.velocity.clone().multiplyScalar(-this.dragCoefficient);
    }

    // دالة التحقق من السقوط في الثقوب الستة بناءً على الإحداثيات المكبّرة
    checkPockets() {
        if (this.isPocketed) return;

        // إحداثيات الثقوب الستة المحددة بدقة في الرسوميات (مضروبة بـ 2.5)
        const pX = (1.27 * 2.5) / 2 - 0.02;
        const pZ = (2.54 * 2.5) / 2 - 0.02;
        const pockets = [
            { x: pX, z: pZ },    { x: -pX, z: pZ },
            { x: pX, z: -pZ },   { x: -pX, z: -pZ },
            { x: (1.27 * 2.5)/2, z: 0 }, { x: -(1.27 * 2.5)/2, z: 0 }
        ];

        const pocketRadiusTrigger = 0.18; // مدى استشعار الفوهة

        for (let pocket of pockets) {
            const dx = this.position.x - pocket.x;
            const dz = this.position.z - pocket.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < pocketRadiusTrigger) {
                this.isPocketed = true;
                this.phase = 'POCKETED';
                // توجيه السرعة ببطء نحو مركز الحفرة لتبدو الحركة انسيابية
                this.velocity.set(pocket.x - this.position.x, 0, pocket.z - this.position.z).normalize().multiplyScalar(0.5);
                console.log(`[Pocket] Ball ID: ${this.id} is falling into a pocket!`);
                break;
            }
        }
    }

    update(dt) {
        // 1. إذا كانت الكرة ساكنة تماماً وليست في الفوهة، لا تفعل شيئاً واخرج فوراً
        if (this.phase === 'idle') return;

        // 2. معالجة حركة السقوط العمودي لأسفل داخل الحفرة (تم عزلها بالكامل في البداية)
        if (this.phase === 'POCKETED') {
            this.velocity.set(0, 0, 0);
            this.angularVelocity.set(0, 0, 0);

            if (!this.isPocketed) {
                this.position.y = 0;
                this.fallingSpeedY = 0;
                this.phase = 'idle';
            } else {
                this.fallingSpeedY += 9.81 * dt;
                this.position.y -= this.fallingSpeedY * dt;

                const safeLimit = -(this.radius * 1.93);
                if (this.position.y < safeLimit) {
                    this.position.y = safeLimit;
                    this.fallingSpeedY = 0;
                }
            }
            return; // الخروج الفوري لضمان عدم تداخل شروط التوقف العادية مع السقوط
        }

        // 3. شروط التوقف الحازمة (تُطبق فقط إذا كانت الكرة فوق الطاولة ولم تسقط بعد)
        let speed = this.velocity.length();
        let angularSpeed = this.angularVelocity.length();

        if (speed < 0.01 || (speed <= STOP_THRESHOLD && angularSpeed <= 0.2)) {
            this.velocity.set(0, 0, 0);
            this.angularVelocity.set(0, 0, 0);
            this.phase = 'idle'; // عودة آمنة للسكون فوق الطاولة
            return;
        }

        // 4. فحص الثقوب أثناء الحركة الطبيعية للكرة
        this.checkPockets();

        // 5. حسابات الحركة الفيزيائية المعتادة (Sliding / Rolling)
        if (this.phase === 'SLIDING') {
            this.t_sliding += dt;

            const gravity = 9.81;
            const frictionMagnitude = this.frictionCoefficient * this.mass * gravity;
            const frictionForce = this.velocity.clone().normalize().multiplyScalar(-frictionMagnitude);
            const dragForce = this.computeDragForce();

            const totalForce = frictionForce.add(dragForce);
            const acceleration = totalForce.clone().divideScalar(this.mass);
            this.velocity.add(acceleration.multiplyScalar(dt));

            const radiusVector = new THREE.Vector3(0, -this.radius, 0);
            const torque = radiusVector.cross(totalForce);
            const angularAcceleration = torque.clone().divideScalar(this.inertia);
            this.angularVelocity.add(angularAcceleration.multiplyScalar(dt));

            const v_mag = this.velocity.length();
            const omega_mag = Math.sqrt(this.angularVelocity.x * this.angularVelocity.x + this.angularVelocity.z * this.angularVelocity.z);

            if (this.t_sliding >= this.t_rolling_limit || Math.abs(v_mag - this.radius * omega_mag) < 0.05) {
                this.phase = 'ROLLING';
            }

        } else if (this.phase === 'ROLLING') {
            const gravity = 9.81;
            const rollingFrictionMag = this.rollingFrictionCoefficient * this.mass * gravity;
            const rollingFrictionForce = this.velocity.clone().normalize().multiplyScalar(-rollingFrictionMag);
            const dragForce = this.computeDragForce();

            const totalForce = rollingFrictionForce.add(dragForce);
            const acceleration = totalForce.clone().divideScalar(this.mass);
            this.velocity.add(acceleration.multiplyScalar(dt));

            const v_mag = this.velocity.length();
            const direction = this.velocity.clone().normalize();
            this.angularVelocity.x = -direction.z * (v_mag / this.radius);
            this.angularVelocity.z = direction.x * (v_mag / this.radius);
        }

        // تحديث الموضع الأفقي
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
    }
}