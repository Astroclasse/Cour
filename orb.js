        const canvas = document.getElementById('orbCanvas');
        const ctx = canvas.getContext('2d');

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let targetMouseX = mouseX;
        let targetMouseY = mouseY;
        let isHovering = false;
        let rotationAngle = 0;

        window.addEventListener('mousemove', (e) => {
            targetMouseX = e.clientX;
            targetMouseY = e.clientY;
            isHovering = true;
        });

        window.addEventListener('mouseleave', () => {
            isHovering = false;
        });

        let baseRadius = 280;
        let pulseAngle = 0;

        function animateOrb() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            mouseX += (targetMouseX - mouseX) * 0.08;
            mouseY += (targetMouseY - mouseY) * 0.08;

            pulseAngle += 0.02;
            let currentIntensity = isHovering ? 0.5 : 0.0;
            let radiusGlow = baseRadius + Math.sin(pulseAngle) * 15 + (currentIntensity * 30);

            if (isHovering) {
                rotationAngle += 0.01;
            } else {
                rotationAngle += 0.003;
            }

            let orbX = canvas.width / 2 + Math.cos(rotationAngle) * (isHovering ? 20 : 5);
            let orbY = canvas.height / 2 + Math.sin(rotationAngle) * (isHovering ? 20 : 5);

            if (isHovering) {
                orbX += (mouseX - canvas.width / 2) * 0.15;
                orbY += (mouseY - canvas.height / 2) * 0.15;
            }

            let gradient = ctx.createRadialGradient(
                orbX, orbY, 0,
                orbX, orbY, radiusGlow
            );

            gradient.addColorStop(0, 'rgba(255, 90, 95, 1)');
            gradient.addColorStop(0.2, 'rgba(239, 71, 111, 0.85)');
            gradient.addColorStop(0.5, 'rgba(82, 39, 255, 0.3)');
            gradient.addColorStop(0.8, 'rgba(82, 39, 255, 0.05)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            requestAnimationFrame(animateOrb);
        }

        animateOrb();
