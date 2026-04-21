// Zip codes for known Starbucks locations
const ZIP_LOOKUP: Record<string, string> = {
  // Greenwich, CT
  '00806': '06830', // 301 Greenwich Ave
  '00829': '06830', // 78 East Putnam Avenue
  // Darien, CT
  '07230': '06820', // 815 Post Rd
  // Stamford, CT
  '00805': '06905', // 1079 High Ridge Road
  '07366': '06905', // 2139 Summer St
  '14466': '06902', // 288 West Avenue
  '67831': '06905', // 64 High Ridge Rd
  // Rye, NY
  '00813': '10580', // 51 Purchase St
  // Rye Brook, NY
  '08795': '10573', // 118 S. Ridge Street
  // Mamaroneck, NY
  '07520': '10543', // 1030 W Boston Post Rd
  // New Rochelle, NY
  '51382': '10801', // 726 North Avenue
  '29709': '10805', // 1170 Wilmot Road
  '64931': '10801', // 80 Huguenot St
  // Harrison, NY
  '80858': '10528', // 318 Halstead Ave
  // Scarsdale, NY
  '02789': '10583', // 51 East Parkway
  '07303': '10583', // 684 White Plains Rd
  // Tuckahoe, NY
  '10464': '10707', // 1 Depot Sq
  // Hartsdale, NY
  '27437': '10530', // 46 S Central Ave
  // Yonkers, NY
  '14369': '10704', // 841-851 Bronx River Rd
  '51379': '10701', // 1086 North Broadway
  '71700': '10710', // 1969 Central Park Ave
  '07901': '10710', // 2458 Central Park Ave
  '23602': '10710', // 1 Ridge Hill Blvd
  '13632': '10710', // 8000 Mall Walk
  // Dobbs Ferry, NY
  '11973': '10522', // 45 Stanley Avenue
  // Elmsford, NY
  '50481': '10523', // 290 E Main St
  // Nanuet, NY
  '11369': '10954', // 126 West Rockland Plaza
  '52742': '10954', // 25 Route 304
  // New City, NY
  '14785': '10956', // 83 South Main
  // Suffern, NY
  '07429': '10901', // 215 Route 59
};

export function getZipForStore(storeNumber: string): string {
  return ZIP_LOOKUP[storeNumber] || '';
}
