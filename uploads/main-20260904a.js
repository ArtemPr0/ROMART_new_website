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
  function resetLeadForm(form) {
    if (!form) return;
    form.classList.remove("is-success");
    form.reset();
    qsa("input, textarea, select", form).forEach(function (el) {
      el.setCustomValidity("");
    });
    var btn = qs('button[type="submit"]', form);
    if (btn) {
      btn.disabled = false;
      if (btn.getAttribute("data-label")) {
        btn.textContent = btn.getAttribute("data-label");
      }
    }
  }

  function openModal(mode) {
    if (!modal) return;
    closeDetailModals();
    var form = qs("form[data-form]", modal);
    resetLeadForm(form);
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
    resetLeadForm(qs("form[data-form]", modal));
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

    var btn = qs('button[type="submit"]', form);
    if (btn && !btn.getAttribute("data-label")) {
      btn.setAttribute("data-label", btn.textContent);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var email = (data.get("email") || "").toString().trim();
      var phone = (data.get("phone") || "").toString().trim();
      var consentInput = qs('input[name="pd_consent"]', form);
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
      if (consentInput && !consentInput.checked) {
        alert("Пожалуйста, подтвердите согласие на обработку персональных данных.");
        consentInput.focus();
        return;
      }
      if (consentInput && consentInput.checked) {
        data.set("pd_consent", "1");
        data.set("pd_consent_at", new Date().toISOString());
      }

      var submitBtn = qs('button[type="submit"]', form);
      var btnLabel =
        (submitBtn && submitBtn.getAttribute("data-label")) ||
        (submitBtn ? submitBtn.textContent : "");
      if (form.getAttribute("data-submitting") === "1") return;
      form.setAttribute("data-submitting", "1");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Отправка…";
      }

      var controller =
        typeof AbortController !== "undefined" ? new AbortController() : null;
      var timeoutId = null;
      if (controller) {
        timeoutId = window.setTimeout(function () {
          try {
            controller.abort();
          } catch (err) {}
        }, 28000);
      }

      fetch(LEAD_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
        signal: controller ? controller.signal : undefined,
      })
        .then(function (res) {
          return res.json().then(
            function (json) {
              return { ok: res.ok && json && json.ok, json: json };
            },
            function () {
              return { ok: false, json: null };
            }
          );
        })
        .then(function (result) {
          if (!result.ok) throw new Error("send-failed");
          form.classList.add("is-success");
          form.scrollIntoView({ block: "nearest", behavior: "smooth" });
          window.setTimeout(function () {
            var inModal = modal && modal.contains(form);
            if (inModal && modal.classList.contains("is-open")) {
              closeModal();
            } else {
              resetLeadForm(form);
            }
          }, 3500);
        })
        .catch(function (err) {
          var aborted =
            err &&
            (err.name === "AbortError" ||
              (typeof err.message === "string" &&
                err.message.toLowerCase().indexOf("abort") !== -1));
          alert(
            aborted
              ? "Связь медленная. Заявка могла уйти — мы проверим. Если в течение минуты не перезвоним: +7 (499) 721-00-00 или " +
                  CONTACT_EMAIL
              : "Не удалось отправить заявку. Позвоните +7 (499) 721-00-00 или напишите на " +
                  CONTACT_EMAIL
          );
        })
        .finally(function () {
          if (timeoutId) window.clearTimeout(timeoutId);
          form.removeAttribute("data-submitting");
          if (submitBtn && !form.classList.contains("is-success")) {
            submitBtn.disabled = false;
            submitBtn.textContent = btnLabel;
          }
        });
    });
  }
  qsa("[data-form]").forEach(handleForm);

  /* Cookie banner */
  var cookie = qs("[data-cookie]");
  var accept = qs("[data-cookie-accept]");
  var key = "romart_cookie_ok_v2";
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

  /* Floating messengers (as on romart.info) */
  (function initMessengerWidget() {
    if (qs("[data-messenger-widget]")) return;

    var style = document.createElement("style");
    style.textContent =
      ".messenger-widget{position:fixed;right:0;bottom:0;z-index:60;display:flex;flex-direction:column;align-items:flex-end;pointer-events:none}" +
      ".messenger-widget__menu{display:flex;flex-direction:column;align-items:flex-end;gap:10px;margin:0 12px 12px 0;opacity:0;visibility:hidden;transform:translateY(8px);transition:opacity .2s ease,transform .2s ease,visibility .2s;pointer-events:none}" +
      ".messenger-widget.is-open .messenger-widget__menu{opacity:1;visibility:visible;transform:translateY(0);pointer-events:auto}" +
      ".messenger-widget__link{display:inline-flex;align-items:center;gap:12px;min-height:44px;padding:8px 10px 8px 16px;border-radius:999px;background:#fff;color:#1a1a1a;text-decoration:none;box-shadow:0 6px 20px rgba(0,0,0,.14);font:600 14px/1.2 Onest,system-ui,sans-serif;white-space:nowrap}" +
      ".messenger-widget__link>span:first-child{text-decoration:underline;text-underline-offset:2px}" +
      ".messenger-widget__link:hover{transform:translateY(-1px)}" +
      ".messenger-widget__badge{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto}" +
      ".messenger-widget__badge--vk{background:#0077ff}" +
      ".messenger-widget__badge--tg{background:#2aabee}" +
      ".messenger-widget__badge--wa{background:#25d366}" +
      ".messenger-widget__toggle{pointer-events:auto;width:72px;height:72px;border:0;cursor:pointer;background:linear-gradient(180deg,#3d8ec4 0%,#2a6ea0 100%);border-radius:36px 0 0 0;display:grid;place-items:center;box-shadow:0 8px 24px rgba(42,110,160,.35);padding:0}" +
      ".messenger-widget__toggle:focus-visible{outline:2px solid #fff;outline-offset:2px}" +
      ".messenger-widget.is-open .messenger-widget__toggle{background:linear-gradient(180deg,#357fae 0%,#245f8a 100%)}" +
      "@media (max-width:720px){.messenger-widget__toggle{width:64px;height:64px;border-radius:32px 0 0 0}.messenger-widget__link{font-size:13px;padding:7px 8px 7px 12px;gap:10px}.messenger-widget__menu{margin:0 8px 10px 0}}";
    document.head.appendChild(style);

    var root = document.createElement("div");
    root.className = "messenger-widget";
    root.setAttribute("data-messenger-widget", "");
    root.innerHTML =
      '<div class="messenger-widget__menu" data-messenger-menu hidden>' +
      '<a class="messenger-widget__link" href="https://t.me/romart1356_bot" target="_blank" rel="noopener noreferrer">' +
      "<span>Написать в Telegram</span>" +
      '<span class="messenger-widget__badge messenger-widget__badge--tg" aria-hidden="true">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M9.78 15.34 9.6 18.1c.26 0 .37-.11.51-.24l2.45-2.35 5.08 3.72c.93.51 1.6.24 1.85-.86L21.8 5.36c.3-1.26-.46-1.76-1.36-1.45L2.9 10.2c-1.22.47-1.2 1.15-.21 1.45l4.53 1.41 10.5-6.62c.5-.3.95-.14.58.19z"/></svg>' +
      "</span></a>" +
      '<a class="messenger-widget__link" href="https://vk.ru/?u=2&to=L3dyaXRlLTk5MzU4NjA2" target="_blank" rel="noopener noreferrer">' +
      "<span>Написать в ВКонтакте</span>" +
      '<span class="messenger-widget__badge messenger-widget__badge--vk" aria-hidden="true">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.08 14.27h-1.46c-.55 0-.72-.44-1.71-1.42-.86-.83-1.24-.94-1.45-.94-.3 0-.38.08-.38.49v1.3c0 .35-.11.56-1.03.56-1.52 0-3.2-.92-4.38-2.63-1.78-2.47-2.27-4.33-2.27-4.71 0-.21.08-.4.49-.4h1.46c.37 0 .51.17.65.56.71 2.05 1.9 3.84 2.39 3.84.18 0 .27-.09.27-.55v-2.13c-.06-.98-.57-1.06-.57-1.41 0-.17.14-.34.37-.34h2.3c.31 0 .42.17.42.53v2.87c0 .31.14.42.22.42.18 0 .33-.11.66-.44 1.02-1.14 1.75-2.9 1.75-2.9.1-.21.26-.4.64-.4h1.46c.44 0 .53.23.44.53-.18.86-1.95 3.35-1.95 3.35-.15.25-.21.36 0 .64.15.21.66.64 1 1.03.62.72 1.1 1.32 1.23 1.74.13.41-.07.62-.48.62z"/></svg>' +
      "</span></a>" +
      '<a class="messenger-widget__link" href="https://wa.me/79265231356" target="_blank" rel="noopener noreferrer">' +
      "<span>Написать в WhatsApp</span>" +
      '<span class="messenger-widget__badge messenger-widget__badge--wa" aria-hidden="true">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12.04 2c-5.46 0-9.91 4.43-9.91 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.9-4.44 9.9-9.9C21.94 6.43 17.5 2 12.04 2zm5.79 14.07c-.24.68-1.4 1.25-1.94 1.33-.5.07-1.13.1-1.82-.11-.42-.13-.96-.28-1.65-.55-2.9-1.25-4.79-4.18-4.94-4.37-.14-.19-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.45.27-.29.59-.36.79-.36h.57c.18 0 .42-.07.66.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.14.31-.29.48-.14.17-.3.37-.43.5-.14.14-.29.29-.12.56.16.27.73 1.2 1.56 1.94 1.08.96 1.98 1.26 2.26 1.4.28.14.44.12.6-.07.16-.19.7-.81.89-1.09.19-.28.38-.23.64-.14.27.1 1.7.8 1.99.95.29.14.49.22.56.34.07.12.07.7-.17 1.38z"/></svg>' +
      "</span></a>" +
      "</div>" +
      '<button type="button" class="messenger-widget__toggle" data-messenger-toggle aria-expanded="false" aria-label="Написать в мессенджеры">' +
      '<svg width="36" height="36" viewBox="0 0 48 48" fill="none" aria-hidden="true">' +
      '<path d="M24 6c-1.2 0-2.2.9-2.4 2.1l-.3 1.6C15.6 11.2 12 16.2 12 22.2v6.3c0 1.3.7 2.5 1.8 3.1l1.7 1v4.2c0 1.3 1.4 2.1 2.6 1.5l4.4-2.3h5c.5 0 1-.1 1.4-.2l4.1 2.1c1.2.6 2.6-.2 2.6-1.5V32.6l1.5-.9c1.1-.6 1.8-1.8 1.8-3.1v-6.3c0-6.1-3.7-11.2-9.4-12.6l-.3-1.5C26.2 6.9 25.2 6 24 6z" fill="#fff"/>' +
      '<circle cx="18.8" cy="22.5" r="2.2" fill="#2a6ea0"/>' +
      '<circle cx="29.2" cy="22.5" r="2.2" fill="#2a6ea0"/>' +
      '<path d="M24 4.5c-.7 0-1.2.5-1.2 1.2V8h2.4V5.7c0-.7-.5-1.2-1.2-1.2z" fill="#fff"/>' +
      '<circle cx="24" cy="3.8" r="1.5" fill="#fff"/>' +
      "</svg></button>";

    document.body.appendChild(root);

    var toggle = qs("[data-messenger-toggle]", root);
    var menu = qs("[data-messenger-menu]", root);

    function setOpen(open) {
      root.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) menu.removeAttribute("hidden");
      else menu.setAttribute("hidden", "");
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!root.classList.contains("is-open"));
    });

    document.addEventListener("click", function (e) {
      if (!root.contains(e.target)) setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  })();
})();
