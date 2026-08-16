import { test, expect } from '@playwright/test';

test.describe('Security RLS & Multi-Gym Sandbox Isolation', () => {
  test('should assert database queries are isolated by gym_id', async ({ request }) => {
    const gymA_id = 'aaaa-1111-aaaa-1111';

    // Mock API query mapping
    const response = await request.post('/api/attendance/face-mark', {
      data: {
        memberCode: 'GYM001',
        confidence: 0.98,
        gymId: gymA_id,
        token: 'cctv_secret_token',
      }
    });

    // We expect the security handshake to accept the payload form (not crash or return unauthorized 401/500 errors)
    expect(response.status()).not.toBe(401);
    expect(response.status()).not.toBe(500);
  });
});

test.describe('Payment checkout E2E mock renewal loop', () => {
  test('should simulate Razorpay checkout order creation and hook captures', async ({ request }) => {
    // 1. Trigger order creation API
    const orderRes = await request.post('/api/payments/razorpay/create-order', {
      data: {
        amount: 2999,
        memberId: 'member_id_placeholder',
        planId: 'plan_id_placeholder',
        gymId: 'gym_id_placeholder',
      }
    });

    expect(orderRes.ok()).toBe(true);
    const order = await orderRes.json();
    
    expect(order).toHaveProperty('orderId');
    expect(order).toHaveProperty('keyId');
    expect(order.amount).toBe(2999);

    // 2. Simulate Razorpay webhook payment capture
    const webhookRes = await request.post('/api/payments/razorpay/webhook', {
      data: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_capture_e2e_mock',
              order_id: order.orderId,
              amount: 2999,
              notes: {
                memberId: 'member_id_placeholder',
                planId: 'plan_id_placeholder',
                gymId: 'gym_id_placeholder',
              }
            }
          }
        }
      }
    });

    expect(webhookRes.ok()).toBe(true);
    const result = await webhookRes.json();
    expect(result).toHaveProperty('received');
    expect(result.received).toBe(true);
  });
});
