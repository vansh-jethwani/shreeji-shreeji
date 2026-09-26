// Lazy Google Maps Places loader for address autocomplete.
// Debounced predictions keep API usage (and cost) low.

let loadPromise = null

export function loadGoogleMaps(apiKey) {
  if (!apiKey) return Promise.reject(new Error('Google Maps API key is not configured'))
  if (typeof window !== 'undefined' && window.google?.maps?.places) {
    return Promise.resolve(window.google.maps)
  }
  if (loadPromise) return loadPromise
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google?.maps?.places) resolve(window.google.maps)
      else reject(new Error('Google Maps failed to initialise'))
    }
    script.onerror = () => reject(new Error('Could not load Google Maps'))
    document.head.appendChild(script)
  })
  return loadPromise
}

/** Debounced place-prediction fetcher. Returns { fetch(query), cancel }. */
export function createPredictionFetcher(maps, debounceMs = 350) {
  const service = new maps.places.AutocompleteService()
  let timer = null
  let seq = 0

  return {
    fetch(query) {
      return new Promise((resolve) => {
        clearTimeout(timer)
        const mySeq = ++seq
        if (!query || query.trim().length < 3) {
          resolve([])
          return
        }
        timer = setTimeout(() => {
          service.getPlacePredictions(
            {
              input: query.trim(),
              componentRestrictions: { country: 'in' },
              types: ['address']
            },
            (predictions, status) => {
              if (mySeq !== seq) return // stale response
              if (status !== maps.places.PlacesServiceStatus.OK || !predictions) {
                resolve([])
                return
              }
              resolve(predictions)
            }
          )
        }, debounceMs)
      })
    },
    cancel() {
      clearTimeout(timer)
      seq++
    }
  }
}

/** Fetch full place details and map them onto our address fields. */
export function getPlaceAddress(maps, placeId) {
  return new Promise((resolve, reject) => {
    const div = document.createElement('div')
    const service = new maps.places.PlacesService(div)
    service.getDetails({ placeId, fields: ['address_components', 'formatted_address', 'geometry'] }, (place, status) => {
      if (status !== maps.places.PlacesServiceStatus.OK || !place) {
        reject(new Error('Could not fetch address details'))
        return
      }
      const comp = (type) =>
        place.address_components?.find((c) => c.types.includes(type))?.long_name || ''
      const pincode =
        place.address_components?.find((c) => c.types.includes('postal_code'))?.long_name || ''
      resolve({
        formattedAddress: place.formatted_address || '',
        street: [comp('street_number'), comp('route')].filter(Boolean).join(' '),
        colony: comp('sublocality_level_2') || comp('sublocality_level_1') || comp('neighborhood') || '',
        area: comp('sublocality_level_1') || comp('locality') || '',
        city: comp('locality') || comp('administrative_area_level_3') || '',
        state: comp('administrative_area_level_1') || '',
        pincode,
        latitude: place.geometry?.location?.lat() ?? null,
        longitude: place.geometry?.location?.lng() ?? null
      })
    })
  })
}
