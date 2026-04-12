import React, { useState, useEffect } from 'react';
import { getAssetUrl } from '../../utils/assetUtils';

const FALLBACK_URL = 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800';

export function FacilityImage({ facility, className }) {
  const facilityImage = 
    getAssetUrl(
      facility.image || 
      facility.primaryImage || 
      facility.images?.find((item) => item.isPrimary)?.url || 
      facility.images?.[0]?.url
    );

  const [imgSrc, setImgSrc] = useState(facilityImage || FALLBACK_URL);

  useEffect(() => {
    // Reset image source if facility data changes
    setImgSrc(facilityImage || FALLBACK_URL);
  }, [facilityImage]);

  return (
    <img 
      src={imgSrc || FALLBACK_URL} 
      alt={facility.name} 
      className={className}
      onError={(e) => {
        if (imgSrc !== FALLBACK_URL) {
          setImgSrc(FALLBACK_URL);
        }
      }}
    />
  );
}
