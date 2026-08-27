(function () {
  "use strict";

  var CONTACT_EMAIL = "zotova@romart.ru";

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
    closeReviewModal();
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

  /* Horizontal sliders (legacy tracks) */
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

  /* Paginated sections (clients / cases / reviews / diplomas) */
  qsa("[data-pages]").forEach(function (root) {
    var pages = qsa("[data-pages-page]", root);
    if (!pages.length) return;
    var barsHost = qs("[data-pages-bars]", root);
    var index = Math.max(
      0,
      pages.findIndex(function (p) {
        return p.classList.contains("is-active");
      })
    );
    if (index < 0) index = 0;

    function renderBars() {
      if (!barsHost) return;
      barsHost.innerHTML = "";
      pages.forEach(function (_, i) {
        var bar = document.createElement("button");
        bar.type = "button";
        bar.className = "pages-bar" + (i === index ? " is-active" : "");
        bar.setAttribute("aria-label", "Страница " + (i + 1));
        bar.addEventListener("click", function () {
          go(i);
        });
        barsHost.appendChild(bar);
      });
    }

    function go(nextIndex) {
      index = (nextIndex + pages.length) % pages.length;
      pages.forEach(function (page, i) {
        page.classList.toggle("is-active", i === index);
      });
      renderBars();
    }

    var prev = qs("[data-pages-prev]", root);
    var next = qs("[data-pages-next]", root);
    if (prev) prev.addEventListener("click", function () { go(index - 1); });
    if (next) next.addEventListener("click", function () { go(index + 1); });

    var touchX = 0;
    var touchY = 0;
    root.addEventListener("touchstart", function (e) {
      if (!e.changedTouches.length) return;
      touchX = e.changedTouches[0].clientX;
      touchY = e.changedTouches[0].clientY;
    }, { passive: true });
    root.addEventListener("touchend", function (e) {
      if (!e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - touchX;
      var dy = e.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      go(dx < 0 ? index + 1 : index - 1);
    }, { passive: true });

    go(index);
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
      qsa("[data-contacts-map]").forEach(function (map) {
        map.classList.toggle(
          "is-active",
          map.getAttribute("data-contacts-map") === name
        );
      });
    });
  });

  /* Map lightbox */
  var mapOverlay = qs("[data-map-overlay]");
  var mapFull = qs("[data-map-full]");

  function closeMapLightbox() {
    if (!mapOverlay) return;
    mapOverlay.classList.remove("is-open");
    mapOverlay.setAttribute("hidden", "");
    if (!qs("[data-detail-modal].is-open") && !(modal && modal.classList.contains("is-open")) && !(drawer && drawer.classList.contains("is-open"))) {
      document.body.classList.remove("nav-open");
    }
  }

  function openMapLightbox(src, alt) {
    if (!mapOverlay || !mapFull || !src) return;
    mapFull.src = src;
    mapFull.alt = alt || "Схема проезда";
    mapOverlay.removeAttribute("hidden");
    mapOverlay.classList.add("is-open");
    document.body.classList.add("nav-open");
  }

  qsa("[data-map-lightbox]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var img = qs("img", btn);
      if (!img) return;
      openMapLightbox(img.getAttribute("src"), img.getAttribute("alt"));
    });
  });

  qsa("[data-map-close]").forEach(function (btn) {
    btn.addEventListener("click", closeMapLightbox);
  });

  if (mapOverlay) {
    mapOverlay.addEventListener("click", function (e) {
      if (e.target === mapOverlay) closeMapLightbox();
    });
  }

  /* Lead-gen modal */
  function openModal(mode) {
    if (!modal) return;
    closeDetailModals();
    var lead = mode === "lead";
    var emailWrap = qs("[data-modal-email]", modal);
    var emailInput = emailWrap ? qs("input", emailWrap) : null;
    if (emailWrap) {
      if (lead) emailWrap.removeAttribute("hidden");
      else emailWrap.setAttribute("hidden", "");
    }
    if (emailInput) {
      emailInput.required = lead;
      if (!lead) emailInput.value = "";
    }
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
      openModal(btn.getAttribute("data-open-modal") || "callback");
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
      closeReviewModal();
      closeMapLightbox();
      closeThanksLightbox();
    }
  });

  /* Diplomas / thanks tabs + lightbox */
  qsa("[data-thanks-tab]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var name = tab.getAttribute("data-thanks-tab");
      qsa("[data-thanks-tab]").forEach(function (t) {
        var on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      qsa("[data-thanks-panel]").forEach(function (panel) {
        panel.classList.toggle(
          "is-active",
          panel.getAttribute("data-thanks-panel") === name
        );
      });
    });
  });

  var thanksOverlay = qs("[data-thanks-overlay]");
  var thanksFull = qs("[data-thanks-full]", thanksOverlay || document);

  function closeThanksLightbox() {
    if (!thanksOverlay) return;
    thanksOverlay.classList.remove("is-open");
    thanksOverlay.setAttribute("hidden", "");
    if (!qs("[data-detail-modal].is-open") && !(modal && modal.classList.contains("is-open")) && !(drawer && drawer.classList.contains("is-open")) && !(reviewModal && reviewModal.classList.contains("is-open")) && !(mapOverlay && mapOverlay.classList.contains("is-open"))) {
      document.body.classList.remove("nav-open");
    }
  }

  function openThanksLightbox(src, alt) {
    if (!thanksOverlay || !thanksFull || !src) return;
    thanksFull.src = src;
    thanksFull.alt = alt || "";
    thanksOverlay.removeAttribute("hidden");
    thanksOverlay.classList.add("is-open");
    document.body.classList.add("nav-open");
  }

  qsa("[data-thanks-open]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var img = qs("img", btn);
      if (!img) return;
      openThanksLightbox(img.getAttribute("src"), img.getAttribute("alt"));
    });
  });

  qsa("[data-thanks-close]").forEach(function (btn) {
    btn.addEventListener("click", closeThanksLightbox);
  });

  if (thanksOverlay) {
    thanksOverlay.addEventListener("click", function (e) {
      if (e.target === thanksOverlay) closeThanksLightbox();
    });
  }

  /* Full review popup */
  var reviewModal = qs("[data-review-modal]");
  var reviewAvatar = qs("[data-review-avatar]", reviewModal || document);
  var reviewPhoto = qs("[data-review-photo]", reviewModal || document);
  var reviewName = qs("[data-review-name]", reviewModal || document);
  var reviewRole = qs("[data-review-role]", reviewModal || document);
  var reviewText = qs("[data-review-text]", reviewModal || document);

  function closeReviewModal() {
    if (!reviewModal) return;
    reviewModal.classList.remove("is-open");
    if (!qs("[data-detail-modal].is-open") && !(modal && modal.classList.contains("is-open")) && !(drawer && drawer.classList.contains("is-open"))) {
      document.body.classList.remove("nav-open");
    }
  }

  function openReviewModal(card) {
    if (!reviewModal || !card) return;
    var photo = qs(".review-featured__photo", card);
    var nameEl = qs(".review-featured__name", card);
    var roleEl = qs(".review-featured__role", card);
    var full = qs(".review-featured__full", card);
    if (reviewPhoto) {
      var src = photo ? (photo.getAttribute("src") || "").trim() : "";
      if (src) {
        reviewPhoto.src = src;
        reviewPhoto.alt = photo.getAttribute("alt") || "";
        if (reviewAvatar) reviewAvatar.classList.remove("is-empty");
      } else {
        reviewPhoto.removeAttribute("src");
        reviewPhoto.alt = "";
        if (reviewAvatar) reviewAvatar.classList.add("is-empty");
      }
    }
    if (reviewName) reviewName.textContent = nameEl ? nameEl.textContent : "";
    if (reviewRole) reviewRole.textContent = roleEl ? roleEl.textContent : "";
    if (reviewText) reviewText.innerHTML = full ? full.innerHTML : "";
    closeDetailModals();
    if (modal) modal.classList.remove("is-open");
    reviewModal.classList.add("is-open");
    document.body.classList.add("nav-open");
  }

  qsa("[data-review-open]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      openReviewModal(btn.closest(".review-featured"));
    });
  });

  qsa("[data-review-close]").forEach(function (btn) {
    btn.addEventListener("click", closeReviewModal);
  });

  if (reviewModal) {
    reviewModal.addEventListener("click", function (e) {
      if (e.target === reviewModal) closeReviewModal();
    });
  }

  /* Forms → server mail endpoint (no mailto / Outlook) */
  var LEAD_ENDPOINT = "/uploads/send-lead.php";

  function setRussianValidity(input) {
    function refreshMessage() {
      if (input.validity.valueMissing) {
        input.setCustomValidity("Пожалуйста, заполните это поле.");
      } else if (input.validity.typeMismatch && input.type === "email") {
        input.setCustomValidity("Пожалуйста, введите корректный email.");
      } else if (input.validity.patternMismatch) {
        input.setCustomValidity("Пожалуйста, проверьте формат поля.");
      } else {
        input.setCustomValidity("");
      }
    }
    input.addEventListener("invalid", refreshMessage);
    input.addEventListener("input", function () {
      input.setCustomValidity("");
    });
  }

  function handleForm(form) {
    qsa("input, textarea, select", form).forEach(setRussianValidity);

    // Honeypot for bots (avoid name "website" — iOS autofill may fill it)
    if (!qs('input[name="romart_hp"]', form)) {
      var hp = document.createElement("input");
      hp.type = "text";
      hp.name = "romart_hp";
      hp.tabIndex = -1;
      hp.autocomplete = "off";
      hp.setAttribute("aria-hidden", "true");
      hp.style.cssText =
        "position:absolute;left:-9999px;height:0;width:0;opacity:0;pointer-events:none;";
      form.appendChild(hp);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var email = (data.get("email") || "").toString().trim();
      var phone = (data.get("phone") || "").toString().trim();
      var emailInput = qs('input[name="email"]', form);
      var needEmail = emailInput && emailInput.required;
      if (!name || !phone) {
        alert("Пожалуйста, заполните имя и телефон.");
        return;
      }
      if (needEmail && !email) {
        alert("Пожалуйста, укажите телефон и email.");
        return;
      }

      var btn = qs('button[type="submit"]', form);
      var btnLabel = btn ? btn.textContent : "";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Отправка…";
      }

      fetch(LEAD_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      })
        .then(function (res) {
          return res.json().then(function (json) {
            return { ok: res.ok && json && json.ok, json: json };
          });
        })
        .then(function (result) {
          if (!result.ok) throw new Error("send-failed");
          form.classList.add("is-success");
          form.scrollIntoView({ block: "nearest", behavior: "smooth" });
        })
        .catch(function () {
          alert(
            "Не удалось отправить заявку. Позвоните +7 (499) 721-00-00 или напишите на " +
              CONTACT_EMAIL
          );
        })
        .finally(function () {
          if (btn && !form.classList.contains("is-success")) {
            btn.disabled = false;
            btn.textContent = btnLabel;
          }
        });
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
