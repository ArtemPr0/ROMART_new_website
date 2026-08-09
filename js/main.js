(function () {
  "use strict";

  var CONTACT_EMAIL = "info@romart.info";

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* Mobile nav */
  var burger = qs("[data-burger]");
  var drawer = qs("[data-nav-drawer]");
  if (burger && drawer) {
    burger.addEventListener("click", function () {
      var open = drawer.classList.toggle("is-open");
      document.body.classList.toggle("nav-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    qsa("a", drawer).forEach(function (link) {
      link.addEventListener("click", function () {
        drawer.classList.remove("is-open");
        document.body.classList.remove("nav-open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Smooth anchors for same-page links */
  qsa('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (!id || id === "#") return;
      var target = qs(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* Detail popups (audience + services) */
  var modal = qs("[data-modal]");

  function closeDetailModals() {
    qsa("[data-detail-modal]").forEach(function (el) {
      el.classList.remove("is-open");
    });
    if (!qs("[data-modal].is-open") && !(drawer && drawer.classList.contains("is-open"))) {
      document.body.classList.remove("nav-open");
    }
  }

  function openDetailModal(id) {
    var panel = qs('[data-detail-modal="' + id + '"]');
    if (!panel) return;
    closeDetailModals();
    if (modal) modal.classList.remove("is-open");
    panel.classList.add("is-open");
    document.body.classList.add("nav-open");
    var closeBtn = qs("[data-detail-close]", panel);
    if (closeBtn) closeBtn.focus();
  }

  qsa("[data-detail-open]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openDetailModal(btn.getAttribute("data-detail-open"));
    });
  });

  qsa("[data-detail-close]").forEach(function (btn) {
    btn.addEventListener("click", closeDetailModals);
  });

  qsa("[data-detail-modal]").forEach(function (panel) {
    panel.addEventListener("click", function (e) {
      if (e.target === panel) closeDetailModals();
    });
  });

  /* Horizontal sliders */
  qsa("[data-slider]").forEach(function (slider) {
    var track = qs("[data-slider-track]", slider);
    var prev = qs("[data-slider-prev]", slider);
    var next = qs("[data-slider-next]", slider);
    if (!track) return;
    var step = function () {
      return Math.min(track.clientWidth * 0.8, 360);
    };
    if (prev) {
      prev.addEventListener("click", function () {
        track.scrollBy({ left: -step(), behavior: "smooth" });
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        track.scrollBy({ left: step(), behavior: "smooth" });
      });
    }
  });

  /* Contacts tabs */
  qsa("[data-contacts-tab]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var name = tab.getAttribute("data-contacts-tab");
      qsa("[data-contacts-tab]").forEach(function (t) {
        t.classList.toggle("is-active", t === tab);
      });
      qsa("[data-contacts-panel]").forEach(function (panel) {
        panel.classList.toggle(
          "is-active",
          panel.getAttribute("data-contacts-panel") === name
        );
      });
    });
  });

  /* Lead-gen modal */
  function openModal() {
    if (!modal) return;
    closeDetailModals();
    modal.classList.add("is-open");
    document.body.classList.add("nav-open");
    var first = qs("input", modal);
    if (first) first.focus();
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    if (!qs("[data-detail-modal].is-open") && !(drawer && drawer.classList.contains("is-open"))) {
      document.body.classList.remove("nav-open");
    }
  }
  qsa("[data-open-modal]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      openModal();
    });
  });
  qsa("[data-close-modal]").forEach(function (btn) {
    btn.addEventListener("click", closeModal);
  });
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeModal();
      closeDetailModals();
    }
  });

  /* Forms → mailto stub */
  function handleForm(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var email = (data.get("email") || "").toString().trim();
      var phone = (data.get("phone") || "").toString().trim();
      if (!name || !phone) {
        alert("Пожалуйста, заполните имя и телефон.");
        return;
      }
      var body = [
        "Имя: " + name,
        "Email: " + email,
        "Телефон: " + phone,
        "",
        "Заявка с сайта romart.ru",
      ].join("\n");
      var mailto =
        "mailto:" +
        CONTACT_EMAIL +
        "?subject=" +
        encodeURIComponent("Заявка с сайта ROMART") +
        "&body=" +
        encodeURIComponent(body);
      window.location.href = mailto;
      form.classList.add("is-success");
    });
  }
  qsa("[data-form]").forEach(handleForm);

  /* Cookie banner */
  var cookie = qs("[data-cookie]");
  var accept = qs("[data-cookie-accept]");
  var key = "romart_cookie_ok";
  try {
    if (cookie && !localStorage.getItem(key)) {
      cookie.classList.add("is-visible");
    }
  } catch (err) {
    if (cookie) cookie.classList.add("is-visible");
  }
  if (accept && cookie) {
    accept.addEventListener("click", function () {
      try {
        localStorage.setItem(key, "1");
      } catch (err) {}
      cookie.classList.remove("is-visible");
    });
  }
})();
