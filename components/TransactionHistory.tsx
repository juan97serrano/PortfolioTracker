'use client';

import { formatCurrency, formatDate, formatShares } from '@/lib/utils';
import type { Transaction } from '@/lib/types';

interface Props {
  transactions: Transaction[];
}

export function TransactionHistory({ transactions }: Props) {
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
            <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Operación</th>
            <th className="pb-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Cantidad</th>
            <th className="pb-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
            <th className="pb-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Comisión</th>
            <th className="pb-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((tx, i) => {
            const isCompra = tx.operation === 'Compra';
            const total = tx.quantity * tx.price + (isCompra ? tx.commission : -tx.commission);
            return (
              <tr key={i} className="hover:bg-gray-50">
                <td className="py-3 text-gray-600">{formatDate(tx.date)}</td>
                <td className="py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium
                    ${isCompra ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                    {tx.operation}
                  </span>
                </td>
                <td className="py-3 text-right tabular-nums text-gray-700">{formatShares(tx.quantity)}</td>
                <td className="py-3 text-right tabular-nums text-gray-700">
                  {formatCurrency(tx.price, tx.currency)}
                </td>
                <td className="py-3 text-right tabular-nums text-gray-500">
                  {formatCurrency(tx.commission, tx.currency)}
                </td>
                <td className={`py-3 text-right tabular-nums font-medium
                  ${isCompra ? 'text-gray-900' : 'text-emerald-600'}`}>
                  {isCompra ? '-' : '+'}{formatCurrency(total, tx.currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
