window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navb');
  
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});



// const counters = document.querySelectorAll(".counter");

// const counterObserver = new IntersectionObserver((entries, observer) => {
//   entries.forEach(entry => {
//     if (!entry.isIntersecting) return;

//     const counter = entry.target;
//     const target = Number(counter.dataset.target);
//     const duration = 2000;
//     const startTime = performance.now();

//     function updateCounter(currentTime) {
//       const progress = Math.min(
//         (currentTime - startTime) / duration,
//         1
//       );

//       // Smooth animation
//       const eased = 1 - Math.pow(1 - progress, 3);

//       counter.textContent = Math.floor(eased * target);

//       if (progress < 1) {
//         requestAnimationFrame(updateCounter);
//       } else {
//         counter.textContent = target;
//       }
//     }

//     requestAnimationFrame(updateCounter);
//     observer.unobserve(counter);
//   });
// }, {
//   threshold: 0.1
// });

// counters.forEach(counter => {
//   counterObserver.observe(counter);
// });




/* =====================================
   1. ANIMATED COUNTERS
===================================== */

const counters = document.querySelectorAll(".counter");

const counterObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const counter = entry.target;
        const target = Number(counter.dataset.target);
        const duration = 2000;
        const startTime = performance.now();

        function animate(currentTime) {
          const progress = Math.min(
            (currentTime - startTime) / duration,
            1
          );

          // Smooth ease-out effect
          const eased = 1 - Math.pow(1 - progress, 3);

          counter.textContent = Math.floor(eased * target);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            counter.textContent = target;
          }
        }

        requestAnimationFrame(animate);

        // Run only once per counter
        observer.unobserve(counter);
      }
    });
  },
  {
    threshold: 0.5
  }
);

counters.forEach((counter) => {
  counterObserver.observe(counter);
});


/* =====================================
   2. SCROLL-TRIGGERED REVEAL ANIMATION
===================================== */

const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");

        // Animate only once
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.15,
    rootMargin: "0px 0px -30px 0px"
  }
);

revealElements.forEach((element) => {
  revealObserver.observe(element);
});
