import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { PremiumValuationsProvider } from '../premium-car/premium-car-valuation.provider';
import { ValuationRequest } from '../types';

vi.mock('axios');

describe('PremiumValuationsProvider', () => {
  let provider: PremiumValuationsProvider;
  const mockRequest: ValuationRequest = {
    vrm: 'ABC123',
    mileage: 50000
  };

  const mockXmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <ValuationPrivateSaleMinimum>14000</ValuationPrivateSaleMinimum>
  <ValuationPrivateSaleMaximum>16000</ValuationPrivateSaleMaximum>
  <ValuationDealershipMinimum>12000</ValuationDealershipMinimum>
  <ValuationDealershipMaximum>13000</ValuationDealershipMaximum>
  <RegistrationDate>2012-06-14T00:00:00.0000000</RegistrationDate>
  <RegistrationYear>2012</RegistrationYear>
  <RegistrationMonth>6</RegistrationMonth>
</root>`;

  beforeEach(() => {
    provider = new PremiumValuationsProvider();
    vi.clearAllMocks();
  });

  it('should have the correct provider name', () => {
    expect(provider.name).toBe('Premium Car');
  });

  it('should construct the correct request URL', () => {
    const url = provider.getRequestUrl(mockRequest.vrm);
    expect(url).toBe('https://run.mocky.io/v3/7d101be3-f162-4459-8a72-0da642e33d9f/valueCar?vrm=ABC123');
  });

  it('should successfully get a valuation', async () => {
    (axios.get as any).mockResolvedValueOnce({
      data: mockXmlResponse
    });

    const result = await provider.getValuation(mockRequest);

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining(mockRequest.vrm),
      expect.objectContaining({
        headers: { Accept: 'application/xml' }
      })
    );

    expect(result).toEqual({
      value: 15000, // (14000 + 16000) / 2
      providerName: 'Premium Car',
      valuation: {
        lowerValue: 14000,
        upperValue: 16000
      },
      requestUrl: expect.stringContaining(mockRequest.vrm)
    });
  });

  it('should throw an error when the API call fails', async () => {
    const error = new Error('API Error');
    (axios.get as any).mockRejectedValueOnce(error);

    await expect(provider.getValuation(mockRequest)).rejects.toThrow('API Error');
  });
}); 