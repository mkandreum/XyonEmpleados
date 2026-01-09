import React, { useState, useEffect } from 'react';
import { payrollService } from '../services/api';
import { Download, FileText, Calendar, DollarSign, TrendingUp, CheckSquare, Square } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { Modal } from '../components/Modal';

interface Payroll {
  id: string;
  month: string;
  year: number;
  amount: number;
  pdfUrl: string;
  status: string;
}

export const PayrollPage: React.FC = () => {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayrolls, setSelectedPayrolls] = useState<Set<string>>(new Set());
  const { modalState, showAlert, closeModal } = useModal();

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const fetchPayrolls = async () => {
    try {
      const data = await payrollService.getAll();
      setPayrolls(data);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePayroll = (id: string) => {
    const newSelected = new Set(selectedPayrolls);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPayrolls(newSelected);
  };

  const toggleAll = () => {
    if (selectedPayrolls.size === payrolls.length) {
      setSelectedPayrolls(new Set());
    } else {
      setSelectedPayrolls(new Set(payrolls.map(p => p.id)));
    }
  };

  const downloadSelected = () => {
    if (selectedPayrolls.size === 0) {
      showAlert('Selecciona al menos una nómina para descargar', 'warning');
      return;
    }

    selectedPayrolls.forEach(id => {
      const payroll = payrolls.find(p => p.id === id);
      if (payroll?.pdfUrl) {
        // Open in new tab with slight delay to avoid popup blocker
        setTimeout(() => {
          window.open(payroll.pdfUrl, '_blank');
        }, 100 * Array.from(selectedPayrolls).indexOf(id));
      }
    });
  };

  const lastPayroll = payrolls[0];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const nextPayrollDate = new Date(currentYear, currentMonth + 1, 0);

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-slate-500">Cargando...</div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mis Nóminas</h1>
        <p className="text-slate-500">Consulta y descarga tus recibos de nómina</p>
      </div>

      {/* Summary Cards */}
      {lastPayroll && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Última Nómina</p>
                <p className="text-2xl font-bold text-slate-900">{lastPayroll.amount.toLocaleString('es-ES')}€</p>
                <p className="text-xs text-slate-400">{lastPayroll.month} {lastPayroll.year}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Próxima Nómina</p>
                <p className="text-lg font-bold text-slate-900">
                  {nextPayrollDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Nóminas Disponibles</p>
                <p className="text-2xl font-bold text-slate-900">{payrolls.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payroll List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="font-semibold text-slate-900">Historial de Nóminas</h2>
          <button
            onClick={downloadSelected}
            disabled={selectedPayrolls.size === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={18} />
            Descargar ({selectedPayrolls.size})
          </button>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={toggleAll}
                    className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase hover:text-slate-700"
                  >
                    {selectedPayrolls.size === payrolls.length && payrolls.length > 0 ? (
                      <CheckSquare size={18} className="text-blue-600" />
                    ) : (
                      <Square size={18} />
                    )}
                    Seleccionar
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Período</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Importe Neto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {payrolls.length > 0 ? (
                payrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => togglePayroll(payroll.id)}
                        className="text-slate-600 hover:text-blue-600"
                      >
                        {selectedPayrolls.has(payroll.id) ? (
                          <CheckSquare size={20} className="text-blue-600" />
                        ) : (
                          <Square size={20} />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <FileText size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{payroll.month} {payroll.year}</div>
                          <div className="text-xs text-slate-500">Nómina mensual</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-900">{payroll.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${payroll.status === 'PAID'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                        }`}>
                        {payroll.status === 'PAID' ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={payroll.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        <Download size={16} />
                        Descargar
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No hay nóminas disponibles
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden">
          {payrolls.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {payrolls.map((payroll) => (
                <div key={payroll.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => togglePayroll(payroll.id)}
                        className="text-slate-600 hover:text-blue-600"
                      >
                        {selectedPayrolls.has(payroll.id) ? (
                          <CheckSquare size={20} className="text-blue-600" />
                        ) : (
                          <Square size={20} />
                        )}
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <FileText size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{payroll.month} {payroll.year}</div>
                          <div className="text-xs text-slate-500">Nómina mensual</div>
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${payroll.status === 'PAID'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                      }`}>
                      {payroll.status === 'PAID' ? 'Pagado' : 'Pendiente'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pl-8">
                    <div className="text-base font-bold text-slate-900">
                      {payroll.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                    </div>
                    <a
                      href={payroll.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 hover:text-blue-600 transition-colors"
                    >
                      <Download size={14} />
                      Descargar PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              No hay nóminas disponibles
            </div>
          )}
        </div>
      </div>
      {/* Global Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
      />
    </div>
  );
};