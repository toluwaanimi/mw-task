import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { SuperCarValuationsProvider } from '../super-car/super-car-valuations.provider';
import { ValuationRequest } from '../types';

vi.mock('axios');

describe('SuperCarValuationsProvider', () => {
  let provider: SuperCarValuationsProvider;
  const mockRequest: ValuationRequest = {
    vrm: 'ABC123',
    mileage: 50000
  };

  const mockJsonResponse = {
    vin: '2HSCNAPRX7C385251',
    registrationDate: '2012-06-14T00:00:00.0000000',
    plate: {
      year: 2012,
      month: 4
    },
    valuation: {
      lowerValue: 23000,
      upperValue: 27000
    }
  };

  beforeEach(() => {
    provider = new SuperCarValuationsProvider();
    vi.clearAllMocks();
  });

  it('should have the correct provider name', () => {
    expect(provider.name).toBe('SuperCar');
  });

  it('should construct the correct request URL', () => {
    const url = provider.getRequestUrl(mockRequest.vrm, mockRequest.mileage);
    expect(url).toBe('https://run.mocky.io/v3/9686820f-fb97-4736-a094-eff20dd2dd87/valuations/ABC123?mileage=50000');
  });

  it('should successfully get a valuation', async () => {
    (axios.get as any).mockResolvedValueOnce({
      data: mockJsonResponse
    });

    const result = await provider.getValuation(mockRequest);

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining(`${mockRequest.vrm}?mileage=${mockRequest.mileage}`)
    );

    expect(result).toEqual({
      value: 25000,
      providerName: 'SuperCar',
      valuation: {
        lowerValue: 23000,
        upperValue: 27000
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