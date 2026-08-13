/* ==========================================================================
   ON AIR - podcast one-pager starter kit - js/script.js
   ==========================================================================
   Plain JavaScript, no libraries. Every feature checks its elements exist
   before wiring anything up, so this one file is safely shared by
   index.html, privacy.html and 404.html - pages missing a feature simply
   skip it, and nothing throws an error.
   ========================================================================== */

/* =====================================================================
   CLIENT SETTING (optional)
   If you want the episode count in the trust strip to update itself,
   set the show's start date and episodes-per-month here, then give the
   trust strip span an id="episode-count". Left as null, nothing runs
   and the hand-typed number on the page stands.
   ===================================================================== */
var EPISODE_COUNT_SETTING = null; // e.g. { startYear: 2023, startMonth: 5, perMonth: 4 }

document.addEventListener('DOMContentLoaded', function () {

  /* =====================================================================
     1. CONTACT FORM - validation + sending
     How it works: we stop the browser's normal form submission, check
     the fields ourselves, then send the data to Netlify with fetch()
     (a way of making a web request from JavaScript without leaving the
     page). Netlify receives it because the form is registered at deploy
     time via the data-netlify attribute.
     IMPORTANT: this ONLY works on the deployed Netlify site. In local
     preview the fetch has nowhere to go, so you will always see the
     error message locally - that is expected, not a bug.
     ===================================================================== */
  var contactForm = document.getElementById('contact-form');
  var formStatus = document.getElementById('form-status');

  if (contactForm && formStatus) {
    contactForm.addEventListener('submit', function (event) {
      event.preventDefault();

      var nameField = document.getElementById('contact-name');
      var emailField = document.getElementById('contact-email');
      var messageField = document.getElementById('contact-message');

      // Required: a name
      if (!nameField.value.trim()) {
        showFormMessage('Please add your name.', true);
        nameField.focus();
        return;
      }

      // Loose email check: something@something.something - not perfect,
      // but it catches the obvious typos without rejecting valid oddities
      var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailField.value.trim())) {
        showFormMessage('That email address does not look right - please check it.', true);
        emailField.focus();
        return;
      }

      // Required: an actual message - a contact form submission with an
      // empty message is just noise in the inbox
      if (!messageField.value.trim()) {
        showFormMessage('Please write a message.', true);
        messageField.focus();
        return;
      }

      showFormMessage('Sending...', false);

      // Package the form data the way Netlify expects
      var formData = new FormData(contactForm);

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
      })
        .then(function (response) {
          // Never claim success without checking response.ok - an earlier
          // project showed "thank you" while sending nothing
          if (response.ok) {
            showFormMessage('Thanks - your message has been sent. We will get back to you soon.', false);
            contactForm.reset();
          } else {
            showFormMessage('Something went wrong sending that. Please try again, or email us directly.', true);
          }
        })
        .catch(function () {
          showFormMessage('Something went wrong sending that. Please try again, or email us directly.', true);
        });
    });
  }

  function showFormMessage(text, isError) {
    if (!formStatus) { return; }
    formStatus.textContent = text;
    formStatus.className = isError ? 'form-error' : 'form-success';
  }

  /* =====================================================================
     2. EPISODE PLAYER SWAP
     Each episode row's Listen button carries the episode's MP3 URL and
     details in data- attributes. Clicking it points the featured player
     at that episode, updates the card's title and number, scrolls up to
     the player and presses play.
     Note on .play(): browsers block autoplay-with-sound until the user
     has interacted with the page. A click on the button satisfies that,
     so playback normally starts - but the try/catch keeps it graceful
     if a browser refuses anyway (the visitor just presses play).
     ===================================================================== */
  var featuredPlayer = document.getElementById('featured-player');
  var playerTitle = document.getElementById('player-title');
  var playerEpnum = document.getElementById('player-epnum');
  var listenButtons = document.querySelectorAll('.episode-listen');

  if (featuredPlayer && listenButtons.length > 0) {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    listenButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var audioSrc = button.getAttribute('data-audio-src');
        var episodeTitle = button.getAttribute('data-episode-title');
        var episodeNumber = button.getAttribute('data-episode-number');

        if (!audioSrc) { return; }

        featuredPlayer.setAttribute('src', audioSrc);

        if (playerTitle && episodeTitle) {
          playerTitle.textContent = episodeTitle;
        }
        if (playerEpnum && episodeNumber) {
          playerEpnum.textContent = episodeNumber;
        }

        // Scroll to the player - instantly for reduced-motion users
        var listenSection = document.getElementById('listen');
        if (listenSection) {
          listenSection.scrollIntoView({
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
          });
        }

        try {
          var playAttempt = featuredPlayer.play();
          // Newer browsers return a promise from .play(); catch its
          // rejection too so nothing surfaces in the console
          if (playAttempt && typeof playAttempt.catch === 'function') {
            playAttempt.catch(function () { /* visitor presses play manually */ });
          }
        } catch (e) {
          // Older browsers may throw synchronously - same outcome
        }
      });
    });
  }

  /* =====================================================================
     3. OPTIONAL FIGURES + FOOTER YEAR
     If the CLIENT SETTING at the top of this file is filled in, the
     element with id="episode-count" is kept roughly current. The footer
     year always updates itself.
     ===================================================================== */
  var episodeCountEl = document.getElementById('episode-count');
  if (episodeCountEl && EPISODE_COUNT_SETTING) {
    var now = new Date();
    var monthsRunning =
      (now.getFullYear() - EPISODE_COUNT_SETTING.startYear) * 12 +
      (now.getMonth() + 1 - EPISODE_COUNT_SETTING.startMonth);
    if (monthsRunning > 0) {
      episodeCountEl.textContent = Math.floor(monthsRunning * EPISODE_COUNT_SETTING.perMonth) + '+';
    }
  }

  var footerYear = document.getElementById('footer-year');
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }

  /* =====================================================================
     4. SCROLL REVEAL
     IntersectionObserver watches for elements entering the viewport and
     adds the .visible class; the CSS does the actual fading. Skipped
     entirely for reduced-motion users and for old browsers without
     IntersectionObserver - they simply see everything at once, because
     the CSS only hides .reveal elements when motion is welcome.
     ===================================================================== */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !reduceMotion) {
    // Auto-apply .reveal to the repeating content elements so new
    // episode rows join the effect without extra classes
    var autoRevealTargets = document.querySelectorAll(
      '.episode-row, .start-card, .review-card, .player-card, .section h2, .section .eyebrow'
    );
    autoRevealTargets.forEach(function (el) {
      el.classList.add('reveal');
    });

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal').forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* =====================================================================
     5. COOKIE CONSENT + GATED EMBED LOADER
     Only relevant in EMBED MODE (a third-party player iframe). The
     banner asks once; the choice lives in localStorage (a small
     browser-side store that survives page reloads) under a key unique
     to this kit. Accept injects the iframe from its data-embed-src;
     decline leaves the dashed placeholder with an external link.
     The footer "Cookie settings" link clears the choice and re-opens
     the banner so a visitor can change their mind.
     In NATIVE AUDIO MODE with the banner removed from the HTML, every
     guard below fails quietly and none of this runs.
     ===================================================================== */
  var CONSENT_KEY = 'on-air-cookie-consent';
  var cookieBanner = document.getElementById('cookie-banner');
  var acceptButton = document.getElementById('cookie-accept');
  var declineButton = document.getElementById('cookie-decline');
  var settingsLink = document.getElementById('cookie-settings-link');
  var embedContainers = document.querySelectorAll('.embed-container[data-embed-src]');

  function loadEmbeds() {
    embedContainers.forEach(function (container) {
      if (container.querySelector('iframe')) { return; } // already loaded
      var iframe = document.createElement('iframe');
      iframe.src = container.getAttribute('data-embed-src');
      iframe.loading = 'lazy';
      iframe.title = container.getAttribute('data-embed-title') || 'Episode player';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      container.innerHTML = '';
      container.appendChild(iframe);
    });
  }

  function applyConsentChoice(choice) {
    if (choice === 'accepted') {
      loadEmbeds();
    }
    // 'declined' leaves the placeholders in place - nothing to do
  }

  if (cookieBanner && acceptButton && declineButton) {
    var storedChoice = null;
    try {
      storedChoice = localStorage.getItem(CONSENT_KEY);
    } catch (e) {
      // Private browsing can block localStorage; treat as no choice made
    }

    if (storedChoice) {
      applyConsentChoice(storedChoice);
    } else if (embedContainers.length > 0) {
      // Only show the banner if there is actually something to gate
      cookieBanner.hidden = false;
    }

    acceptButton.addEventListener('click', function () {
      try { localStorage.setItem(CONSENT_KEY, 'accepted'); } catch (e) { }
      cookieBanner.hidden = true;
      applyConsentChoice('accepted');
    });

    declineButton.addEventListener('click', function () {
      try { localStorage.setItem(CONSENT_KEY, 'declined'); } catch (e) { }
      cookieBanner.hidden = true;
    });
  }

  if (settingsLink && cookieBanner) {
    settingsLink.addEventListener('click', function (event) {
      event.preventDefault();
      try { localStorage.removeItem(CONSENT_KEY); } catch (e) { }
      cookieBanner.hidden = false;
    });
  }

});
