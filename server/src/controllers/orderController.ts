import { Request, Response } from 'express';
import { createOrder, getOrdersByUserId, updateOrderStatus } from '../models/Order';

export const placeOrder = async (req: Request, res: Response) => {
  try {
    const orderId = await createOrder(req.body);
    res.status(201).json({ message: 'Order placed', orderId });
  } catch (error) {
    res.status(500).json({ message: 'Error placing order' });
  }
};

export const getMyOrders = async (req: Request, res: Response) => {
  try {
    // Assuming req.user.id comes from auth middleware
    const orders = await getOrdersByUserId((req as any).user.id);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

export const changeStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    await updateOrderStatus(Number(req.params.id), status);
    res.json({ message: 'Order status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating status' });
  }
};