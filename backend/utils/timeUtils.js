/**
 * Normalizes a time string to HH:MM format (24-hour, zero-padded)
 * @param {string} time - The time string (e.g., "9:00", "09:0", "9:00:00", "09:00 PM")
 * @returns {string|null} - The normalized "HH:MM" string or null if invalid
 */
const normalizeTime = (time) => {
  if (!time || typeof time !== 'string') return null;

  // Handle AM/PM format if present
  let processedTime = time.trim().toUpperCase();
  const ampmMatch = processedTime.match(/(\d{1,2})[:.](\d{1,2})\s*(AM|PM)/);
  
  if (ampmMatch) {
    let [_, hours, minutes, period] = ampmMatch;
    hours = parseInt(hours);
    minutes = parseInt(minutes);
    
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Handle standard 24h format (HH:MM or HH:MM:SS)
  const standardMatch = processedTime.match(/(\d{1,2})[:.](\d{1,2})/);
  if (standardMatch) {
    let [_, hours, minutes] = standardMatch;
    hours = parseInt(hours);
    minutes = parseInt(minutes);
    
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  return null;
};

module.exports = { normalizeTime };
