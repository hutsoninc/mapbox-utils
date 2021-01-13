import {isDefined, metersToMiles} from './utils'
import fetch from 'isomorphic-fetch'

export interface ClientOptions {
  accessToken: string
}

export type Coordintates = [number, number]

type AddressWithCoordintates = {
  address: string
  coordintates: Coordintates
}

export default class Client {
  private accessToken: string
  private cache: AddressWithCoordintates[] = []
  private baseUrl: string = "https://api.mapbox.com";

  constructor(options: ClientOptions = { accessToken: undefined }) {
    this.setAccessToken(options.accessToken)
  }

  private setAccessToken (accessToken: string): never | void {
    if(!isDefined(accessToken) || accessToken === '') {
      throw new Error('No Mapbox access token provided.')
    }
    this.accessToken = accessToken
  }

  private getCachedAddress (address: string): AddressWithCoordintates | undefined {
    return this.cache.find(obj => obj.address === address)
  }
  
  /**
   * Validate coordinates input or get the coordinates for a given address
   */
  private async ensureCoordintates (address: string | Coordintates): Promise<Coordintates> {
    if(typeof address === 'string') {
      // Check cache for address
      const cached = this.getCachedAddress(address)
      if(cached) {
        // Use cached coordintates
        return cached.coordintates
      }else {
        // Fetch coordintates
        return this.getAddressCoordintates(address)
      }
    }else if(Array.isArray(address) && address.length === 2 && typeof address[0] === 'number' && typeof address[1] === 'number') {
      return address
    }else {
      throw new Error(`Invalid value \`${address}\` given as address.`)
    }
  }

  /**
   * Get the driving distance in miles between two given coordinates
   */
  private async getDistanceInMiles(address1Coordinates: Coordintates, address2Coordinates): Promise<number> {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/directions-matrix/v1/mapbox/driving/${address1Coordinates.join(',')};${address2Coordinates.join(',')}/?annotations=distance&sources=0&access_token=${this.accessToken}`;
    
        fetch(url, {
          method: "GET",
        })
          .then(async (res) => {
            const status = res.status;
            if (status !== 200) {
              reject(
                `Error getting driving distance between provided coordinates \`${address1Coordinates.join(',')}\` and \`${address2Coordinates.join(',')}\`. Server responded with status code ${status}. Message: ${res.statusText}`,
              );
            }
            const body = await res.json();
            if (
              !Array.isArray(body.distances) ||
              !Array.isArray(body.distances[0])
            ) {
              reject(`Failed to get driving distance between provided coordinates \`${address1Coordinates.join(',')}\` and \`${address2Coordinates.join(',')}\`.`)
            }
          
            const distance = body.distances[0].find((val) => val !== 0);
            const distanceInMiles = isDefined(distance) ? metersToMiles(distance) : 0
            resolve(distanceInMiles);
          })
          .catch((err) => {
            reject(`Error getting driving distance between provided coordinates \`${address1Coordinates.join(',')}\` and \`${address2Coordinates.join(',')}\`. Message: ${err}`);
          });
    })
  }

  /**
   * Get the coordinates of a given address. Matches the most similar address in Mapbox, so it's not always exact.
   */
  public async getAddressCoordintates(address: string): Promise<Coordintates> {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(
        address
      )}.json?types=address&access_token=${this.accessToken}`;
    
        fetch(url, {
          method: "GET",
        })
          .then(async (res) => {
            const status = res.status;
            if (status !== 200) {
              reject(
                `Error geocoding provided address \`${address}\`. Server responded with status code ${status}. Message: ${res.statusText}`,
              );
            }
            const body = await res.json();
            if (
              !Array.isArray(body.features) ||
              body.features.length === 0
            ) {
              reject(`No matching locations for provided address \`${address}\`.`);
            }
            const coordintates = body.features[0].geometry.coordinates;
            resolve(coordintates);
          })
          .catch((err) => {
            reject(`Error geocoding provided address \`${address}\`. Message: ${err}`);
          });
      })
  }

  /**
   * Get the driving distance in miles between two given addresses or coordintates. Coordinates must be formatted as
   * a tuple [longitude, latitude].
   */
  public async getDrivingDistance (address1: string | Coordintates, address2: string | Coordintates): Promise<number> {
    const address1Coordintates: Coordintates = await this.ensureCoordintates(address1)
    const address2Coordintates: Coordintates = await this.ensureCoordintates(address2)

    return this.getDistanceInMiles(address1Coordintates, address2Coordintates)
  }
}