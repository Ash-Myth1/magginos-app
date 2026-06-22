import { collection, addDoc, updateDoc, doc, runTransaction } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { db } from '../firebase'; // Adjust path if necessary

// Securely grab environment variables
const emailConfig = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  newOrderTemplate: import.meta.env.VITE_EMAILJS_TEMPLATE_NEW_ORDER,
  deliveredTemplate: import.meta.env.VITE_EMAILJS_TEMPLATE_DELIVERED,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

const logicalDay = (ts) => {
  const d = new Date(ts);
  if (d.getHours() < 5) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const OrderService = {
  // 1. Place a new order with stock validation
  placeOrder: async (orderData) => {
    try {
      // Validate hard limit locally
      for (const item of orderData.items) {
        if (item.qty > 10) {
          throw new Error(`Sanity limit exceeded: You cannot order more than 10 of a single item (${item.name}).`);
        }
      }
      
      const docRef = await addDoc(collection(db, "orders"), orderData);
      
      // Fire confirmation email asynchronously
      if (!emailConfig.serviceId) {
        console.warn("EmailJS is not configured! Please check your VITE_EMAILJS environment variables.");
      } else {
        emailjs.send(
          emailConfig.serviceId,
          emailConfig.newOrderTemplate,
          {
            to_name: orderData.customer.name || 'Magginos Customer',
            to_email: orderData.customer.email,
            order_id: orderData.displayId,
            total: orderData.total
          },
          emailConfig.publicKey
        ).catch(err => console.error("EmailJS Error:", err));
      }

      return docRef.id;
    } catch (error) {
      console.error("Database Error:", error);
      throw error;
    }
  },

  // 2. Update order status
  updateStatus: async (orderId, newStatus, orderData) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const now = Date.now();
      const payload = { status: newStatus };
      
      if (newStatus === 'Cooking') payload['timestamps.acceptedAt'] = now;
      else if (newStatus === 'Out for Delivery' || newStatus === 'Ready for Pickup') payload['timestamps.readyAt'] = now;
      else if (newStatus === 'Delivered') payload['timestamps.deliveredAt'] = now;

      await updateDoc(orderRef, payload);

      if ((newStatus === 'Delivered' || newStatus === 'Ready for Pickup') && orderData?.customer?.email) {
        const statusText = newStatus === 'Ready for Pickup' 
          ? 'ready to be picked up' 
          : (orderData.orderType === 'delivery' ? 'delivered to your room' : 'picked up');
          
        if (!emailConfig.serviceId) {
          console.warn("EmailJS is not configured! Please check your VITE_EMAILJS environment variables.");
        } else {
          emailjs.send(
            emailConfig.serviceId,
            emailConfig.deliveredTemplate,
            {
              to_name: orderData.customer.name || 'Magginos Customer',
              to_email: orderData.customer.email,
              order_id: orderData.displayId,
              status: statusText
            },
            emailConfig.publicKey
          ).catch(err => console.error("EmailJS Error:", err));
        }
      }
      return true;
    } catch (error) {
      console.error("Database Error:", error);
      throw new Error("Failed to update status");
    }
  },

  // 3. Submit item ratings
  submitRatings: async (orderId, updatedItems) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { items: updatedItems });
      return true;
    } catch (error) {
      console.error("Database Error:", error);
      throw new Error("Failed to submit rating");
    }
  }
};