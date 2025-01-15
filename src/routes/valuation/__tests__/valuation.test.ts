import './setup';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import type { FindOptionsWhere } from 'typeorm';
import { buildApp } from '@app/app';
import { ProviderLog, VehicleValuation } from '@app/models';
import { ValuationRequest } from '@app/providers';

// Get mocks from global scope
const { 
  mockValuationRepo, 
  mockProviderLogRepo, 
  mockSuperCarProvider, 
  mockPremiumProvider 
} = global as any;

describe('ValuationController (e2e)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    try {
      app = await buildApp();
    } catch (error) {
      console.error('Failed to build app:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockValuationRepo.findOne.mockReset();
    mockValuationRepo.save.mockReset();
    mockProviderLogRepo.save.mockReset();
    mockSuperCarProvider.getValuation.mockReset();
    mockPremiumProvider.getValuation.mockReset();
    
    // Reset mock implementations
    mockValuationRepo.findOne.mockImplementation((options: { where?: FindOptionsWhere<VehicleValuation> }) => {
      if (options.where?.vrm === 'ABC123') {
        return Promise.resolve({
          vrm: 'ABC123',
          lowestValue: 15000,
          highestValue: 15000,
          midpointValue: 15000,
          providerName: 'SuperCar',
          mileage: 50000,
          createdAt: new Date(),
          updatedAt: new Date()
        } as VehicleValuation);
      }
      return Promise.resolve(null);
    });
    mockValuationRepo.create.mockImplementation((data: Partial<VehicleValuation>) => data as VehicleValuation);
    mockValuationRepo.save.mockImplementation((data: Partial<VehicleValuation>) => Promise.resolve({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    } as VehicleValuation));
    mockProviderLogRepo.create.mockImplementation((data: Partial<ProviderLog>) => data as ProviderLog);
    mockProviderLogRepo.save.mockImplementation((data: Partial<ProviderLog>) => Promise.resolve(data as ProviderLog));
    mockSuperCarProvider.getValuation.mockResolvedValue({
      value: 20000,
      providerName: 'SuperCar',
      valuation: {
        lowerValue: 20000,
        upperValue: 20000
      },
      requestUrl: 'http://supercar.com/valuations/ABC123'
    });
    mockPremiumProvider.getValuation.mockResolvedValue({
      value: 25000,
      providerName: 'Premium Car',
      valuation: {
        lowerValue: 25000,
        upperValue: 25000
      },
      requestUrl: 'http://premium.com/valueCar?vrm=ABC123'
    });
  });

  describe('GET /valuations/:vrm', () => {
    it('should return 404 if valuation not found', async () => {
      mockValuationRepo.findOne.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/valuations/ABC123'
      });

      expect(res.statusCode).toStrictEqual(404);
    });

    it('should return valuation if found', async () => {
      const mockValuation = {
        vrm: 'ABC123',
        lowestValue: 15000,
        highestValue: 15000,
        midpointValue: 15000,
        providerName: 'SuperCar',
        mileage: 50000,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockValuationRepo.findOne.mockResolvedValue(mockValuation);

      const res = await app.inject({
        method: 'GET',
        url: '/valuations/ABC123'
      });

      const payload = JSON.parse(res.payload);
      expect(res.statusCode).toStrictEqual(200);
      expect(payload).toMatchObject({
        vrm: mockValuation.vrm,
        lowestValue: mockValuation.lowestValue,
        highestValue: mockValuation.highestValue,
        midpointValue: mockValuation.midpointValue,
        providerName: mockValuation.providerName,
        mileage: mockValuation.mileage
      });
      expect(new Date(payload.createdAt)).toBeInstanceOf(Date);
      expect(new Date(payload.updatedAt)).toBeInstanceOf(Date);
    });
  });

  describe('PUT /valuations/', () => {
    it('should return 404 if VRM is missing', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/valuations',
        payload: {
          mileage: 50000
        }
      });

      expect(res.statusCode).toStrictEqual(404);
    });

    it('should return 400 if VRM is 8 characters or more', async () => {
      const requestBody: ValuationRequest = {
        mileage: 10000,
        vrm: '12345678'
      };

      const res = await app.inject({
        url: '/valuations/12345678',
        payload: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(400);
    });

    it('should return 400 if mileage is missing', async () => {
      const requestBody: ValuationRequest = {
        vrm: 'ABC123',
        mileage: 0
      };

      const res = await app.inject({
        url: '/valuations/ABC123',
        payload: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(400);
    });

    it('should return 400 if mileage is negative', async () => {
      const requestBody: ValuationRequest = {
        vrm: 'ABC123',
        mileage: -1,
      };

      const res = await app.inject({
        url: '/valuations/ABC123',
        payload: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(400);
    });

    it('should return 200 with valid request', async () => {
      const mockValuation = {
        vrm: 'ABC123',
        lowestValue: 20000,
        highestValue: 20000,
        midpointValue: 20000,
        providerName: 'SuperCar',
        mileage: 50000,
        createdAt: new Date(),
        updatedAt: new Date()
      } as VehicleValuation;

      mockValuationRepo.findOne.mockResolvedValue(null);
      mockValuationRepo.save.mockResolvedValue(mockValuation);
      mockSuperCarProvider.getValuation.mockResolvedValue({
        value: 20000,
        providerName: 'SuperCar',
        valuation: {
          lowerValue: 20000,
          upperValue: 20000
        },
        requestUrl: 'http://supercar.com/valuations/ABC123'
      });

      const res = await app.inject({
        method: 'PUT',
        url: '/valuations/ABC123',
        payload: {
          mileage: 50000
        }
      });

      expect(res.statusCode).toStrictEqual(200);
      expect(JSON.parse(res.payload)).toMatchObject({
        vrm: 'ABC123',
        lowestValue: 20000,
        highestValue: 20000,
        midpointValue: 20000,
        providerName: 'SuperCar',
        mileage: 50000
      });
      expect(mockValuationRepo.save).toHaveBeenCalled();
      expect(mockProviderLogRepo.save).toHaveBeenCalled();
    });
  });
});
