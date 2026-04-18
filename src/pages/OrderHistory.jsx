import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectOrders, loadOrderHistory } from '../features/orderSlice';
import { Package, Calendar, Receipt } from 'lucide-react';
import { formatDate, formatPrice } from '../utils/helpers';

const OrderHistory = () => {
  const dispatch = useDispatch();
  const orders = useSelector(selectOrders);

  useEffect(() => {
    
    dispatch(loadOrderHistory());
  }, [dispatch]);

  const getDerivedTotal = (order) => {
    const grandTotal = Number(order.grandTotal);
    if (Number.isFinite(grandTotal) && grandTotal > 0) {
      return grandTotal;
    }

    const total = Number(order.total);
    if (Number.isFinite(total) && total > 0) {
      return total;
    }

    const subtotal = Number(order.subtotal);
    const tax = Number(order.tax);
    const shipping = Number(order.shipping);
    if (Number.isFinite(subtotal) && subtotal > 0) {
      const computedTax = Number.isFinite(tax) ? tax : subtotal * 0.08;
      const computedShipping = Number.isFinite(shipping) ? shipping : (subtotal >= 100 ? 0 : 9.99);
      return subtotal + computedTax + computedShipping;
    }

    if (!order.items || order.items.length === 0) {
      return 0;
    }

    const itemsSubtotal = order.items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0
    );

    if (itemsSubtotal <= 0) {
      return 0;
    }

    return itemsSubtotal + itemsSubtotal * 0.08 + (itemsSubtotal >= 100 ? 0 : 9.99);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-white">
      <h1 className="text-3xl font-black mb-8 text-white">Order History</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-slate-950 border border-slate-800 rounded-2xl">
          <Package size={48} className="mx-auto mb-4 text-slate-400" />
          <p className="text-slate-200 text-lg">No orders yet</p>
          <p className="text-slate-400 text-sm mt-2">Your orders will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...orders].reverse().map((order, idx) => {
            const createdAt = order.submittedAt || order.savedAt;
            const total = getDerivedTotal(order);

            return (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl shadow-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
                  <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">Order ID</p>
                    <p className="font-mono font-bold text-sm break-all text-green-300">{order.orderId || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1 flex items-center gap-1">
                      <Calendar size={14} /> Date
                    </p>
                    <p className="font-semibold text-slate-100">{createdAt ? formatDate(createdAt) : 'N/A'}</p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1 flex items-center gap-1">
                      <Receipt size={14} /> Total
                    </p>
                    <p className="font-bold text-blue-300">{formatPrice(total)}</p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">Items</p>
                    <p className="font-semibold text-slate-100">
                      {order.items ? order.items.length : 0} item{order.items && order.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <h3 className="text-sm font-semibold mb-3 text-slate-200">Ordered Items</h3>
                  {order.items && order.items.length > 0 ? (
                    <div className="space-y-3">
                      {order.items.map((item, itemIdx) => {
                        const qty = Number(item.quantity) || 0;
                        const unitPrice = Number(item.price) || 0;
                        const lineTotal = qty * unitPrice;

                        return (
                          <div key={itemIdx} className="grid grid-cols-1 md:grid-cols-[72px_1fr_auto_auto] gap-3 items-center bg-slate-900 border border-slate-800 rounded-xl p-3">
                            <div className="w-16 h-16 bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                              {item.image ? (
                                <img src={item.image} alt={item.title || `Item ${itemIdx + 1}`} className="h-full w-full object-contain p-1" />
                              ) : (
                                <Package size={20} className="text-slate-500" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-100 break-words">{item.title || 'Untitled product'}</p>
                              <p className="text-xs text-slate-400 capitalize mt-1">{item.category || 'Uncategorized'}</p>
                            </div>
                            <div className="text-sm text-slate-300">Qty: <span className="font-semibold text-slate-100">{qty}</span></div>
                            <div className="text-right">
                              <p className="text-xs text-slate-400">{formatPrice(unitPrice)} each</p>
                              <p className="text-sm font-bold text-blue-300">{formatPrice(lineTotal)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No item details available for this order.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
