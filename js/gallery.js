(() => {
  const gallery = document.querySelector('#gallery');
  const scene = gallery.querySelector('.gallery-scene');
  const stage = gallery.querySelector('.gallery-stage');
  const canvas = gallery.querySelector('.gallery-canvas');
  const viewport = gallery.querySelector('.gallery-window');
  const track = gallery.querySelector('.gallery-track');
  const motion = matchMedia(
    '(min-width: 850px) and (min-height: 570px) and (prefers-reduced-motion: no-preference)'
  );
  const MOTION = {
    stiffness: 625,
    damping: 50,
    verticalRatio: .14,
    scrollRatio: 1.18,
    edgeRatio: .18
  };

  let scrollDistance = 0;
  let horizontalDistance = 0;
  let verticalTravel = 0;
  let position = 0;
  let velocity = 0;
  let lastTime = 0;
  let pendingFrame = 0;

  const clamp = value => Math.max(0, Math.min(1, value));
  // scene 向上经过的距离除以 sticky 可停留的总距离，得到局部进度。
  const readProgress = () => clamp(-scene.getBoundingClientRect().top / scrollDistance);

  function draw(progress) {
    track.style.transform = `translateX(${-progress * horizontalDistance}px)`;
    canvas.style.transform = `translateY(${-progress * verticalTravel}px)`;
  }

  function follow(target, elapsed) {
    // 限制每个积分步长。速度在相邻帧保留，阻尼让它逐步消退。
    const steps = Math.ceil(elapsed * 120);
    const step = elapsed / steps;
    for (let i = 0; i < steps; i++) {
      const error = target - position;
      const acceleration = MOTION.stiffness * error - MOTION.damping * velocity;
      velocity += acceleration * step;
      const next = position + velocity * step;
      if ((target - next) * error <= 0) {
        position = target;
        velocity = 0;
        return;
      }
      position = next;
    }
  }

  function render(now) {
    pendingFrame = 0;
    if (!scrollDistance) return;

    const target = readProgress();
    const elapsed = lastTime ? (now - lastTime) / 1000 : 1 / 60;
    lastTime = now;
    if (elapsed > .16 || target === 0 || target === 1) {
      position = target;
      velocity = 0;
    } else {
      follow(target, Math.min(elapsed, 1 / 30));
    }

    if (Math.abs(target - position) < .0003 && Math.abs(velocity) < .008) {
      position = target;
      velocity = 0;
    }

    // 接近边界时逐步减少弹簧的滞后，让粘滞进入和释放都能精确对齐。
    const edge = clamp(Math.min(target, 1 - target) / MOTION.edgeRatio);
    const springWeight = edge * edge * (3 - 2 * edge);
    draw(target + (position - target) * springWeight);

    if (position !== target) scheduleRender();
    else lastTime = 0;
  }

  function scheduleRender() {
    if (scrollDistance && !pendingFrame) pendingFrame = requestAnimationFrame(render);
  }

  function measure() {
    gallery.classList.toggle('is-moving', motion.matches);
    horizontalDistance = motion.matches ? track.scrollWidth - viewport.clientWidth : 0;
    if (horizontalDistance <= 0) {
      gallery.classList.remove('is-moving');
      scrollDistance = 0;
      scene.style.height = '';
      stage.style.removeProperty('--gallery-lift');
      track.style.transform = '';
      canvas.style.transform = '';
      return;
    }

    const stageHeight = stage.offsetHeight;
    verticalTravel = Math.min(window.innerHeight * MOTION.verticalRatio, stageHeight * .16, horizontalDistance * .22);
    stage.style.setProperty('--gallery-lift', `${verticalTravel}px`);
    scene.style.height = `${stageHeight + Math.round(horizontalDistance * MOTION.scrollRatio)}px`;
    scrollDistance = scene.clientHeight - stageHeight;
    position = readProgress();
    velocity = 0;
    lastTime = 0;
    draw(position);
  }

  window.addEventListener('scroll', scheduleRender, { passive: true });
  window.addEventListener('resize', measure);
  motion.addEventListener('change', measure);
  measure();
})();
