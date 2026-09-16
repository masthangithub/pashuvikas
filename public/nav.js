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
    '</nav><div class="sidebar-foot">SQLite · pashu-vikas.db</div>';
})();
