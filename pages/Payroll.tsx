import React, { useState, useEffect } from 'react';
import { payrollService } from '../services/api';
import { Payroll } from '../types';
import { Download, Filter } from 'lucide-react';

export const PayrollPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState<number>(currentYear);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayrolls = async () => {
      try {
        const data = await payrollService.getAll();
        setPayrolls(data);
      } catch (error) {
        console.error("Error fetching payrolls:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayrolls();
  }, []);

  const filteredPayrolls = payrolls.filter(p => p.year === yearFilter);

  const handleDownload = (payroll: Payroll) => {
    if (payroll.pdfUrl) {
      // Open PDF in new tab
      window.open(payroll.pdfUrl, '_blank');
    } else {
      alert('PDF no disponible para esta nómina');
    }
  };

  const lastPayroll = payrolls.length > 0 ? payrolls[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mi Nómina</h1>
          <p className="text-slate-500">Histórico de pagos y retenciones.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50">
            <Filter size={18} />
            <span>Filtros</span>
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm">
            <Download size={18} />
            <span>Certificado Retenciones</span>
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        {lastPayroll ? (
          <>
            <h3 className="text-sm font-semibold text-slate-500 mb-2">Última Nómina ({lastPayroll.month} {lastPayroll.year})</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{lastPayroll.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-6 text-sm">
              {/* Placeholder values since we only have net amount in simple model */}
              <div>
                <p className="text-slate-500">Bruto (Est.)</p>
                <p className="font-semibold">{(lastPayroll.amount * 1.25).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
              </div>
              <div>
                <p className="text-slate-500">Retenciones (Est.)</p>
                <p className="font-semibold">{(lastPayroll.amount * 0.25).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            No hay datos de nómina disponibles.
          </div>
        )}
      </div>

      {/* List Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-semibold text-slate-900">Histórico de Nóminas</h2>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
            className="bg-white border border-slate-300 rounded-md text-sm py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Periodo</th>
                <th className="px-6 py-3">Fecha Pago</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Importe Neto</th>
                <th className="px-6 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-slate-500">Cargando...</td>
                </tr>
              ) : filteredPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-slate-500">No hay nóminas para este año.</td>
                </tr>
              ) : (
                filteredPayrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {payroll.month} {payroll.year}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      30 {payroll.month} {payroll.year}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Pagado
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {payroll.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDownload(payroll)}
                        className="text-blue-600 hover:text-blue-900 font-medium hover:bg-blue-50 p-2 rounded-lg transition-colors"
                        title="Descargar PDF"
                      >
                        <Download size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};