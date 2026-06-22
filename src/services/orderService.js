import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { db } from '../firebase';

// ── EmailJS config from environment variables ─────────────────────────────────
// All four keys must be set in .env.local (local) and Vercel Dashboard (production).
// If any are missing, emails will be skipped and a clear warning logged.
const emailConfig = {
  serviceId:         import.meta.env.VITE_EMAILJS_SERVICE_ID,
  newOrderTemplate:  import.meta.env.VITE_EMAILJS_TEMPLATE_NEW_ORDER,
  deliveredTemplate: import.meta.env.VITE_EMAILJS_TEMPLATE_DELIVERED,
  publicKey:         import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

/**
 * Returns true if every required EmailJS env variable is present.
 * Logs a descriptive warning for each missing key when called.
 */
function isEmailConfigValid() {
  const required = {
    VITE_EMAILJS_SERVICE_ID:          emailConfig.serviceId,
    VITE_EMAILJS_TEMPLATE_NEW_ORDER:  emailConfig.newOrderTemplate,
    VITE_EMAILJS_TEMPLATE_DELIVERED:  emailConfig.deliveredTemplate,
    VITE_EMAILJS_PUBLIC_KEY:          emailConfig.publicKey,
  };
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    console.warn(
      `[EmailJS] ⚠️  Missing env variable(s): ${missing.join(', ')}.\n` +
      `  → Set them in .env.local (dev) and Vercel Dashboard → Environment Variables (prod).\n` +
      `  → Emails will NOT be sent until all four keys are present.`
    );
    return false;
  }
  return true;
}

/**
 * Sends an EmailJS email, logging a clear error with status code on failure.
 */
async function sendEmail(templateId, params) {
  try {
    const result = await emailjs.send(
      emailConfig.serviceId,
      templateId,
      params,
      emailConfig.publicKey
    );
    console.info(`[EmailJS] ✅ Email sent — status ${result.status}: ${result.text}`);
  } catch (err) {
    // err from @emailjs/browser v4 is an EmailJSResponseStatus object
    const status = err?.status ?? 'unknown';
    const text   = err?.text   ?? String(err);
    console.error(`[EmailJS] ❌ Failed to send email (status ${status}): ${text}`);
  }
}

export const OrderService = {
  // 1. Place a new order with stock validation
  placeOrder: async (orderData) => {
    try {
      // Validate hard limit locally
      for (const item of orderData.items) {
        if (item.qty > 10) {
          throw new Error(
            `Sanity limit exceeded: You cannot order more than 10 of a single item (${item.name}).`
          );
        }
      }

      const docRef = await addDoc(collection(db, 'orders'), orderData);

      // ── Send order confirmation email ────────────────────────────────────
      const customerEmail = orderData?.customer?.email;
      if (!customerEmail) {
        console.warn('[EmailJS] Skipping confirmation email — customer email is missing.');
      } else if (isEmailConfigValid()) {
        // Non-blocking: do not await so the order write is never delayed
        sendEmail(emailConfig.newOrderTemplate, {
          to_name:  orderData.customer.name || 'Magginos Customer',
          to_email: customerEmail,
          order_id: orderData.displayId,
          total:    orderData.total,
        });
      }

      return docRef.id;
    } catch (error) {
      console.error('[OrderService] placeOrder error:', error);
      throw error;
    }
  },

  // 2. Update order status
  updateStatus: async (orderId, newStatus, orderData) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const now = Date.now();
      const payload = { status: newStatus };

      if (newStatus === 'Cooking')                                                     payload['timestamps.acceptedAt']  = now;
      else if (newStatus === 'Out for Delivery' || newStatus === 'Ready for Pickup')   payload['timestamps.readyAt']     = now;
      else if (newStatus === 'Delivered')                                              payload['timestamps.deliveredAt'] = now;

      await updateDoc(orderRef, payload);

      // ── Send delivery / pickup notification email ────────────────────────
      const shouldNotify = newStatus === 'Delivered' || newStatus === 'Ready for Pickup';
      const customerEmail = orderData?.customer?.email;

      if (shouldNotify && !customerEmail) {
        console.warn('[EmailJS] Skipping delivery email — customer email is missing.');
      } else if (shouldNotify && isEmailConfigValid()) {
        const statusText =
          newStatus === 'Ready for Pickup'
            ? 'ready to be picked up'
            : orderData.orderType === 'delivery'
              ? 'delivered to your room'
              : 'picked up';

        sendEmail(emailConfig.deliveredTemplate, {
          to_name:  orderData.customer.name || 'Magginos Customer',
          to_email: customerEmail,
          order_id: orderData.displayId,
          status:   statusText,
        });
      }

      return true;
    } catch (error) {
      console.error('[OrderService] updateStatus error:', error);
      throw new Error('Failed to update status');
    }
  },

  // 3. Submit item ratings
  submitRatings: async (orderId, updatedItems) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { items: updatedItems });
      return true;
    } catch (error) {
      console.error('[OrderService] submitRatings error:', error);
      throw new Error('Failed to submit rating');
    }
  },
};