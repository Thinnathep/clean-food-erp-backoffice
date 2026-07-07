import { supabase } from '../../../config/supabase';

export interface FuelPrice {
  fuel_type: string;
  price_per_liter: number;
}

export const fetchFuelPricesFromBangchak = async (): Promise<FuelPrice[] | null> => {
  try {
    // Bangchak API provides current retail oil prices
    const response = await fetch('https://oil-price.bangchak.co.th/ApiOilPrice2/en');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch fuel prices: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Process the data: we need to find the specific fuel types we care about
    // Example response structure needs to be mapped.
    // The API usually returns an array of oil items, or an object containing an array.
    // For safety, we will also fetch from DB if this fails or parses incorrectly.
    
    const mappedPrices: FuelPrice[] = [];
    
    let items: any[] = [];
    if (Array.isArray(data) && data.length > 0 && typeof data[0].OilList === 'string') {
      try {
        items = JSON.parse(data[0].OilList);
      } catch (e) {
        console.error('Failed to parse OilList JSON:', e);
      }
    } else {
      items = Array.isArray(data) ? data : (data.item || data.data || []);
    }
    
    if (Array.isArray(items) && items.length > 0) {
       for (const item of items) {
           const name = (item.OilName || item.oilName || item.name || '').toLowerCase();
           const price = parseFloat(item.Price || item.price || item.PriceToday || '0');
           
           if (name.includes('gasohol 91')) mappedPrices.push({ fuel_type: 'gasohol91', price_per_liter: price });
           else if (name.includes('gasohol 95')) mappedPrices.push({ fuel_type: 'gasohol95', price_per_liter: price });
           else if (name.includes('e20')) mappedPrices.push({ fuel_type: 'e20', price_per_liter: price });
           else if (name.includes('diesel') && !name.includes('premium')) mappedPrices.push({ fuel_type: 'diesel', price_per_liter: price });
       }
    }
    
    if (mappedPrices.length > 0) {
        return mappedPrices;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching fuel prices from Bangchak:', error);
    return null;
  }
};

export const updateFuelPricesInDB = async (prices: FuelPrice[]) => {
  try {
    for (const price of prices) {
      const { error } = await supabase
        .from('erp_fuel_prices')
        .upsert({
          fuel_type: price.fuel_type,
          price_per_liter: price.price_per_liter,
          source: 'bangchak_api',
          updated_at: new Date().toISOString()
        }, { onConflict: 'fuel_type' });
      
      if (error) {
        console.error('Supabase Upsert Error:', error);
        throw new Error(error.message);
      }
    }
  } catch (error) {
    console.error('Error updating fuel prices in DB:', error);
    throw error;
  }
};

export const getFuelPrices = async (): Promise<Record<string, number>> => {
  try {
    const { data, error } = await supabase
      .from('erp_fuel_prices')
      .select('fuel_type, price_per_liter');

    if (error) throw error;
    
    const priceMap: Record<string, number> = {};
    if (data) {
        data.forEach(item => {
            priceMap[item.fuel_type] = item.price_per_liter;
        });
    }
    
    return priceMap;
  } catch (error) {
    console.error('Error getting fuel prices from DB:', error);
    // Return sensible defaults if DB fetch fails
    return {
        gasohol91: 36.08,
        gasohol95: 36.65,
        diesel: 29.94,
        e20: 34.24
    };
  }
};

export const refreshFuelPrices = async (): Promise<Record<string, number>> => {
    const freshPrices = await fetchFuelPricesFromBangchak();
    if (freshPrices && freshPrices.length > 0) {
        await updateFuelPricesInDB(freshPrices);
    }
    return await getFuelPrices();
};
