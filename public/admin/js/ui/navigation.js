class Navigation {
  constructor(router) {
    this.router = router;
    this.navLinks = document.querySelectorAll('.sidebar .nav-link');
  }

  init() {
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const path = new URL(link.href).hash;
        window.location.hash = path;
      });
    });

    window.addEventListener('hashchange', () => this.updateActiveLink());
    this.updateActiveLink();
  }

  updateActiveLink() {
    const currentHash = window.location.hash || '#/dashboard';

    this.navLinks.forEach(link => {
      const linkHash = new URL(link.href).hash;

      if (linkHash === currentHash) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}

export default Navigation;