(function () {
  const items = [
    { section: "Overview" },
    { href: "/index.html", label: "Dashboard" },
    { section: "Records" },
    { href: "/farmers.html", label: "Farmers" },
    { href: "/doctors.html", label: "Doctors" },
    { href: "/buffaloes.html", label: "Buffaloes" },
    { href: "/visits.html", label: "Visits" },
    { section: "Capture" },
    { href: "/farmer-register.html", label: "Register farmer" },
    { href: "/doctor-register.html", label: "Register doctor" },
    { href: "/buffalo-register.html", label: "Register buffalo" },
    { href: "/visit-schedule.html", label: "Schedule visit" },
    { href: "/health-assessment.html", label: "Health assessment" }
  ];
  const path = location.pathname === "/" ? "/index.html" : location.pathname;
  const el = document.getElementById("sidebar");
  if (!el) return;
  el.innerHTML =
    '<div class="brand">Pashu Vikas<span>PoC · local build</span></div><nav>' +
    items
      .map((i) =>
        i.section
          ? '<div class="group-label">' + i.section + "</div>"
          : '<a href="' + i.href + '" class="' + (path === i.href ? "active" : "") + '">' + i.label + "</a>"
      )
      .join("") +
    '</nav><div class="sidebar-foot">JSON file · pashu-vikas.json</div>';

  const toggle = document.createElement('button');
  toggle.className = 'sidebar-toggle';
  toggle.setAttribute('aria-label', 'Menu');
  toggle.textContent = '☰';
  document.body.appendChild(toggle);

  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  function closeMenu() { el.classList.remove('open'); overlay.classList.remove('show'); }
  toggle.addEventListener('click', () => { el.classList.add('open'); overlay.classList.add('show'); });
  overlay.addEventListener('click', closeMenu);
  el.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
})();
