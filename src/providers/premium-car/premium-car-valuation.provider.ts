import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import {
  Provider,
  PremiumValuationTransformer,
  ValuationResponse,
  ValuationRequest,
} from '@app/providers';

export class PremiumValuationsProvider implements Provider {
  name = 'Premium Car';
  private baseUrl =
    'https://run.mocky.io/v3/7d101be3-f162-4459-8a72-0da642e33d9f';
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
