import { collection, addDoc, updateDoc, doc, runTransaction, getDoc, setDoc } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { db } from '../firebase';
import { getLogicalDayKey } from '../utils/dateUtils';

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
  // 1. Place a new order with transactional stock validation
  placeOrder: async (orderData) => {
    try {
      // Validate hard limit locally (fast fail before hitting Firestore)
      for (const item of orderData.items) {
        if (item.qty > 10) {
          throw new Error(
            `Sanity limit exceeded: You cannot order more than 10 of a single item (${item.name}).`
          );
        }
      }

      const todayKey = getLogicalDayKey();
      const inventoryRef = doc(db, 'settings', 'inventory');
      const dailyStatsRef = doc(db, 'daily_stats', todayKey);

      // ── Atomic transaction: read stock → validate → write order ────────
      const newOrderId = await runTransaction(db, async (transaction) => {
        // 1. Read current inventory (prepCounts set by admin)
        const inventorySnap = await transaction.get(inventoryRef);
        const prepCounts = inventorySnap.exists()
          ? (inventorySnap.data().prepCounts ?? {})
          : {};

        // 2. Read today's sold counts (incremented atomically per checkout)
        const dailySnap = await transaction.get(dailyStatsRef);
        const currentSoldCounts = dailySnap.exists()
          ? (dailySnap.data().soldCounts ?? {})
          : {};

        // 3. Validate every item in the cart against remaining stock
        const newSoldCounts = { ...currentSoldCounts };
        for (const item of orderData.items) {
          const prepared = prepCounts[item.name];
          // If no prepCount is set for this item, skip stock validation
          // (the admin hasn't configured inventory tracking for it)
          if (prepared === undefined) {
            newSoldCounts[item.name] = (newSoldCounts[item.name] ?? 0) + item.qty;
            continue;
          }

          const alreadySold = currentSoldCounts[item.name] ?? 0;
          const remaining = prepared - alreadySold;

          if (item.qty > remaining) {
            throw new Error(
              remaining <= 0
                ? `Sorry, ${item.name} is sold out!`
                : `Sorry, only ${remaining} ${item.name} left. You requested ${item.qty}.`
            );
          }
          newSoldCounts[item.name] = alreadySold + item.qty;
        }

        // 4. Write the updated sold counts
        if (dailySnap.exists()) {
          transaction.update(dailyStatsRef, { soldCounts: newSoldCounts });
        } else {
          transaction.set(dailyStatsRef, { soldCounts: newSoldCounts });
        }

        // 5. Create the order document
        //    Note: transaction.set with a new doc ref is used instead of addDoc
        //    because addDoc is not supported inside transactions.
        const newOrderRef = doc(collection(db, 'orders'));
        transaction.set(newOrderRef, orderData);

        return newOrderRef.id;
      });

      // ── Send order confirmation email (non-blocking) ──────────────────
      const customerEmail = orderData?.customer?.email;
      if (!customerEmail) {
        console.warn('[EmailJS] Skipping confirmation email — customer email is missing.');
      } else if (isEmailConfigValid()) {
        sendEmail(emailConfig.newOrderTemplate, {
          to_name:  orderData.customer.name || 'Magginos Customer',
          to_email: customerEmail,
          order_id: orderData.displayId,
          total:    orderData.total,
        });
      }

      return newOrderId;
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