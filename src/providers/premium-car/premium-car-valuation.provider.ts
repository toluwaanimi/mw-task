import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import {
  Provider,
  PremiumValuationTransformer,
  ValuationResponse,
  ValuationRequest,
} from '@app/providers';
import { PROVIDER_CONFIG } from '@app/config';

export class PremiumValuationsProvider implements Provider {
  name = 'Premium Car';
  private baseUrl = PROVIDER_CONFIG.PREMIUM_CAR_BASE_URL;
  private parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: true,
  });

  getRequestUrl(vrm: string): string {
    return `${this.baseUrl}/valueCar?vrm=${vrm}`;
  }

  async getValuation(request: ValuationRequest): Promise<ValuationResponse> {
    try {
      const requestUrl = this.getRequestUrl(request.vrm);
      const response = await axios.get(requestUrl, {
        headers: {
          Accept: 'application/xml',
        },
      });

      const parsedXml = this.parser.parse(response.data);
      const valuation = PremiumValuationTransformer.transform(
        parsedXml,
        request.vrm,
      );

      return {
        value: valuation.midpointValue,
        providerName: this.name,
        valuation: {
          lowerValue: valuation.lowestValue,
          upperValue: valuation.highestValue,
        },
        requestUrl,
      };
    } catch (error) {
      throw error;
    }
  }
}
