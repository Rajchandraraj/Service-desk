// src/pages/PlaceholderPage.js
import React from 'react';

function PlaceholderPage({ title }) {
  return (
    <div className="mt-6 text-center text-lg text-gray-600">
      🚧 <span className="font-semibold">{title}</span> is under construction. Please check back later.
    </div>
  );
}

export default PlaceholderPage;
