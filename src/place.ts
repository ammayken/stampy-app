import * as Location from 'expo-location';

/**
 * Best guess at where the phone is, like "Lisbon, Portugal". Asks for location access the
 * first time. Returns null if access is refused or anything goes wrong: place is optional.
 */
export async function suggestPlace(): Promise<string | null> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return null;
    const position =
      (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    const [address] = await Location.reverseGeocodeAsync(position.coords);
    if (!address) return null;
    const parts = [address.city ?? address.district ?? address.region, address.country];
    return parts.filter(Boolean).join(', ') || null;
  } catch {
    return null;
  }
}
