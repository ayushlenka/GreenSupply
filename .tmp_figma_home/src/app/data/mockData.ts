// Type Definitions
export type AccountType = 'business' | 'supplier';

export interface Business {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  accountType: AccountType;
}

export interface BuyingGroup {
  id: string;
  productName: string;
  category: string;
  unitType: string;
  currentUnits: number;
  targetUnits: number;
  savingsPerUnit: number;
  participatingBusinesses: number;
  daysLeft: number;
  regionCenter: { lat: number; lng: number };
  status: 'active' | 'near-target' | 'confirmed';
  businessIds: string[];
}

// Mock Business POI Data (San Francisco businesses)
export const mockBusinesses: Business[] = [
  {
    id: 'b1',
    name: 'Urban Harvest Cafe',
    address: '2340 Polk Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94109',
    lat: 37.7989,
    lng: -122.4232,
    accountType: 'business'
  },
  {
    id: 'b2',
    name: 'Green Plate Bistro',
    address: '1524 Fillmore Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94115',
    lat: 37.7841,
    lng: -122.4321,
    accountType: 'business'
  },
  {
    id: 'b3',
    name: 'Mission Earth Market',
    address: '3145 Valencia Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94110',
    lat: 37.7483,
    lng: -122.4205,
    accountType: 'business'
  },
  {
    id: 'b4',
    name: 'Sunset Organic Deli',
    address: '1234 Irving Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94122',
    lat: 37.7634,
    lng: -122.4686,
    accountType: 'business'
  },
  {
    id: 'b5',
    name: 'Bay Fresh Provisions',
    address: '450 Hayes Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    lat: 37.7770,
    lng: -122.4234,
    accountType: 'business'
  },
  {
    id: 'b6',
    name: 'Marina Green Grocer',
    address: '2350 Chestnut Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94123',
    lat: 37.8001,
    lng: -122.4401,
    accountType: 'business'
  },
  {
    id: 'b7',
    name: 'Richmond Roots Kitchen',
    address: '5234 Geary Boulevard',
    city: 'San Francisco',
    state: 'CA',
    zip: '94118',
    lat: 37.7808,
    lng: -122.4698,
    accountType: 'business'
  },
  {
    id: 'b8',
    name: 'SOMA Sustainable Eats',
    address: '345 Brannan Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94107',
    lat: 37.7792,
    lng: -122.3971,
    accountType: 'business'
  },
  {
    id: 'b9',
    name: 'Nob Hill Provisions',
    address: '1155 California Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94108',
    lat: 37.7915,
    lng: -122.4141,
    accountType: 'business'
  },
  {
    id: 'b10',
    name: 'Castro Community Market',
    address: '2341 Market Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94114',
    lat: 37.7620,
    lng: -122.4354,
    accountType: 'business'
  },
  {
    id: 'b11',
    name: 'Pacific Heights Table',
    address: '2398 Fillmore Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94115',
    lat: 37.7915,
    lng: -122.4334,
    accountType: 'business'
  },
  {
    id: 'b12',
    name: 'Dogpatch Urban Farm',
    address: '801 22nd Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94107',
    lat: 37.7568,
    lng: -122.3889,
    accountType: 'business'
  }
];

// Mock Buying Groups Data
export const mockBuyingGroups: BuyingGroup[] = [
  {
    id: 'g1',
    productName: 'Organic Heirloom Tomatoes',
    category: 'Produce',
    unitType: 'cases',
    currentUnits: 87,
    targetUnits: 100,
    savingsPerUnit: 8.50,
    participatingBusinesses: 8,
    daysLeft: 4,
    regionCenter: { lat: 37.7849, lng: -122.4294 },
    status: 'near-target',
    businessIds: ['b1', 'b2', 'b5', 'b6', 'b9', 'b11', 'b8', 'b3']
  },
  {
    id: 'g2',
    productName: 'Compostable Food Containers',
    category: 'Packaging',
    unitType: 'pallets',
    currentUnits: 34,
    targetUnits: 50,
    savingsPerUnit: 45.00,
    participatingBusinesses: 12,
    daysLeft: 9,
    regionCenter: { lat: 37.7749, lng: -122.4194 },
    status: 'active',
    businessIds: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11', 'b12']
  },
  {
    id: 'g3',
    productName: 'Local Grass-Fed Ground Beef',
    category: 'Meat & Seafood',
    unitType: 'lbs',
    currentUnits: 520,
    targetUnits: 500,
    savingsPerUnit: 2.25,
    participatingBusinesses: 6,
    daysLeft: 2,
    regionCenter: { lat: 37.7694, lng: -122.4512 },
    status: 'confirmed',
    businessIds: ['b2', 'b4', 'b7', 'b10', 'b11', 'b6']
  },
  {
    id: 'g4',
    productName: 'Recycled Paper Towels',
    category: 'Supplies',
    unitType: 'boxes',
    currentUnits: 145,
    targetUnits: 200,
    savingsPerUnit: 3.75,
    participatingBusinesses: 9,
    daysLeft: 7,
    regionCenter: { lat: 37.7599, lng: -122.4148 },
    status: 'active',
    businessIds: ['b3', 'b8', 'b12', 'b5', 'b9', 'b1', 'b10', 'b4', 'b7']
  },
  {
    id: 'g5',
    productName: 'Certified Fair Trade Coffee Beans',
    category: 'Beverages',
    unitType: 'bags',
    currentUnits: 76,
    targetUnits: 80,
    savingsPerUnit: 12.00,
    participatingBusinesses: 7,
    daysLeft: 3,
    regionCenter: { lat: 37.7899, lng: -122.4065 },
    status: 'near-target',
    businessIds: ['b1', 'b2', 'b5', 'b8', 'b9', 'b11', 'b6']
  },
  {
    id: 'g6',
    productName: 'Biodegradable Cleaning Products',
    category: 'Supplies',
    unitType: 'gallons',
    currentUnits: 98,
    targetUnits: 150,
    savingsPerUnit: 6.50,
    participatingBusinesses: 10,
    daysLeft: 12,
    regionCenter: { lat: 37.7651, lng: -122.4381 },
    status: 'active',
    businessIds: ['b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b10', 'b11', 'b9', 'b1']
  }
];

// Calculate group bounds (2x2 mile area)
export const calculateGroupBounds = (center: { lat: number; lng: number }) => {
  // 1 mile ≈ 0.0145 degrees latitude
  // 1 mile ≈ 0.0182 degrees longitude at SF latitude
  const latOffset = 0.0145;
  const lngOffset = 0.0182;
  
  return {
    north: center.lat + latOffset,
    south: center.lat - latOffset,
    east: center.lng + lngOffset,
    west: center.lng - lngOffset
  };
};

// Helper to get businesses in a group
export const getBusinessesForGroup = (group: BuyingGroup): Business[] => {
  return mockBusinesses.filter(business => 
    group.businessIds.includes(business.id)
  );
};
