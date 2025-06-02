// src/components/Footer.jsx

const Footer = () => {
  return (
    <footer className="bg-white text-gray-600 text-sm py-4 text-center border-t mt-6">
      © {new Date().getFullYear()} Rapyder Azure Portal. All rights reserved.
    </footer>
  );
};

export default Footer;
