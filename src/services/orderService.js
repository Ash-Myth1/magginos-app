import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { db } from '../firebase'; // Adjust path if necessary

// Securely grab environment variables
const emailConfig = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  newOrderTemplate: import.meta.env.VITE_EMAILJS_TEMPLATE_NEW_ORDER,
  deliveredTemplate: import.meta.env.VITE_EMAILJS_TEMPLATE_DELIVERED,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

export const OrderService = {
  // 1. Place a new order
  placeOrder: async (orderData) => {
    try {
      const docRef = await addDoc(collection(db, "orders"), orderData);
      
      // Fire confirmation email asynchronously
      emailjs.send(
        emailConfig.serviceId,
        emailConfig.newOrderTemplate,
        {
          to_name: orderData.customer.name,
          to_email: orderData.customer.email,
          order_id: orderData.displayId,
          total: orderData.total
        },
        emailConfig.publicKey
      ).catch(err => console.error("EmailJS Error:", err));

      return docRef.id;
    } catch (error) {
      console.error("Database Error:", error);
      throw new Error("Failed to place order");
    }
  },

  // 2. Update order status
  updateStatus: async (orderId, newStatus, orderData) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });

      if (newStatus === 'Delivered' && orderData.customer.email) {
        const statusText = orderData.orderType === 'delivery' ? 'delivered to your room' : 'picked up';
        emailjs.send(
          emailConfig.serviceId,
          emailConfig.deliveredTemplate,
          {
            to_name: orderData.customer.name,
            to_email: orderData.customer.email,
            order_id: orderData.displayId,
            status: statusText
          },
          emailConfig.publicKey
        ).catch(err => console.error("EmailJS Error:", err));
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