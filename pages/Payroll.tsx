import React, { useState, useEffect, useRef, useCallback } from 'react';
import { payrollService, uploadService } from '../services/api';
import { Download, FileText, Calendar, DollarSign, TrendingUp, CheckSquare, Square, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { Modal } from '../components/Modal';
import { StatCard } from '../components/StatCard';
import { openProtectedFile } from '../utils/fileUtils';
import { LoadingState, EmptyState } from '../components/PageState';

interface Payroll {
  id: string;
  month: string;
  year: number;
  amount: number;
  pdfUrl: string;
  signedPdfUrl?: string;
  status: string;
}

const formatAmount = (amount: number) => `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`;

const PayrollStatus: React.FC<{ status: string }> = ({ status }) => (
  <span className={`px-2 py-1 text-xs font-medium rounded-full ${status === 'PAID'
    ? 'bg-success-soft dark:bg-green-900/30 text-success-ink dark:text-green-300'
    : 'bg-warning-soft dark:bg-amber-900/30 text-warning-ink dark:text-amber-300'}`}>
    {status === 'PAID' ? 'Pagado' : 'Pendiente'}
  </span>
);

const PayrollPeriod: React.FC<{ payroll: Payroll }> = ({ payroll }) => (
  <div className="flex items-center gap-3">
    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-control" aria-hidden="true">
      <FileText size={18} />
    </div>
    <div>
      <div className="text-sm font-medium text-slate-900 dark:text-white">{payroll.month} {payroll.year}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">Nómina mensual</div>
    </div>
  </div>
);

const SelectToggle: React.FC<{ checked: boolean; label: string; onToggle: () => void }> = ({ checked, label, onToggle }) => (
  <button
    onClick={onToggle}
    role="checkbox"
    aria-checked={checked}
    aria-label={label}
    className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
  >
    {checked ? <CheckSquare size={20} className="text-blue-600 dark:text-blue-400" /> : <Square size={20} />}
  </button>
);

interface SignedActionProps {
  payroll: Payroll;
  uploading: boolean;
  onUpload: (id: string) => void;
  onOpen: (url: string) => void;
  /** `chip` = bordered pill for mobile cards; `link` = plain text action for the table. */
  variant: 'chip' | 'link';
}

/** "View signed" if the signed PDF exists, otherwise an upload action. */
const SignedAction: React.FC<SignedActionProps> = ({ payroll, uploading, onUpload, onOpen, variant }) => {
  const chip = variant === 'chip';
  if (payroll.signedPdfUrl) {
    const url = payroll.signedPdfUrl;
    return chip ? (
      <button onClick={() => onOpen(url)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-success-soft dark:bg-emerald-900/20 border border-green-200 dark:border-emerald-800 rounded-control text-success-ink dark:text-emerald-400 text-sm font-medium">
        <CheckCircle size={14} aria-hidden="true" />
        Firmada
      </button>
    ) : (
      <div className="flex items-center gap-2">
        <CheckCircle size={16} className="text-success" aria-hidden="true" />
        <button onClick={() => onOpen(url)} className="text-success-ink dark:text-emerald-400 text-sm font-medium hover:underline">
          Ver firmada
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => onUpload(payroll.id)}
      disabled={uploading}
      className={chip
        ? 'inline-flex items-center gap-1.5 px-3 py-2 bg-warning-soft dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-control text-warning-ink dark:text-amber-400 text-sm font-medium transition-colors disabled:opacity-50'
        : 'inline-flex items-center gap-1.5 text-warning-ink dark:text-amber-400 hover:underline font-medium text-sm disabled:opacity-50'}
    >
      {uploading ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}
      {chip ? 'Firmar' : 'Subir firmada'}
    </button>
  );
};

export const PayrollPage: React.FC = () => {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayrolls, setSelectedPayrolls] = useState<Set<string>>(new Set());
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { modalState, showAlert, closeModal } = useModal();

  const fetchPayrolls = useCallback(async () => {
    try {
      setPayrolls(await payrollService.getAll());
    } catch (error) {
      console.error('Error fetching payrolls:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayrolls(); }, [fetchPayrolls]);

  const togglePayroll = (id: string) => {
    const next = new Set(selectedPayrolls);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPayrolls(next);
  };

  const allSelected = payrolls.length > 0 && selectedPayrolls.size === payrolls.length;
  const toggleAll = () => setSelectedPayrolls(allSelected ? new Set() : new Set(payrolls.map(p => p.id)));

  const downloadSelected = () => {
    if (selectedPayrolls.size === 0) {
      showAlert('Selecciona al menos una nómina para descargar', 'warning');
      return;
    }
    // Stagger the opens so the browser does not block them as popups.
    Array.from(selectedPayrolls).forEach((id, index) => {
      const payroll = payrolls.find(p => p.id === id);
      if (!payroll?.pdfUrl) return;
      setTimeout(async () => {
        try {
          await openProtectedFile(payroll.pdfUrl);
        } catch (error) {
          console.error('Error opening payroll:', error);
        }
      }, 300 * index);
    });
  };

  const openFile = async (url: string, errorMessage: string) => {
    try {
      await openProtectedFile(url);
    } catch (error) {
      console.error('Error opening payroll:', error);
      showAlert(errorMessage, 'error');
    }
  };
  const openPayroll = (payroll: Payroll) => openFile(payroll.pdfUrl, 'No se pudo abrir la nómina');
  const openSigned = (url: string) => openFile(url, 'No se pudo abrir');

  const triggerSignedUpload = (payrollId: string) => {
    setUploadTargetId(payrollId);
    fileInputRef.current?.click();
  };

  const handleSignedFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;

    if (file.type !== 'application/pdf') {
      showAlert('Solo se permiten archivos PDF', 'warning');
      e.target.value = '';
      return;
    }

    setUploadingId(uploadTargetId);
    try {
      const uploadResult = await uploadService.uploadPayroll(file);
      await payrollService.uploadSigned(uploadTargetId, uploadResult.url);
      await fetchPayrolls();
      showAlert('Nómina firmada subida correctamente', 'success');
    } catch (error) {
      console.error('Error uploading signed payroll:', error);
      showAlert('Error al subir la nómina firmada', 'error');
    } finally {
      setUploadingId(null);
      setUploadTargetId(null);
      e.target.value = '';
    }
  };

  if (loading) return <LoadingState label="Cargando..." fullPage />;

  const lastPayroll = payrolls[0];
  const now = new Date();
  const nextPayrollDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const headerCell = 'px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400';

  return (
    <div className="space-y-6">
      <div className="animate-slide-up">
        <h1 className="page-title">Mis nóminas</h1>
        <p className="page-subtitle">Consulta y descarga tus recibos de nómina</p>
      </div>

      {lastPayroll && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={DollarSign}
            iconClass="bg-success-soft dark:bg-green-900/20 text-success dark:text-green-400"
            label="Última nómina"
            value={`${lastPayroll.amount.toLocaleString('es-ES')}€`}
            caption={`${lastPayroll.month} ${lastPayroll.year}`}
            delay="delay-75"
          />
          <StatCard
            icon={Calendar}
            iconClass="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            label="Próxima nómina"
            value={<span className="text-lg">{nextPayrollDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>}
            delay="delay-150"
          />
          <StatCard
            icon={TrendingUp}
            iconClass="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
            label="Nóminas disponibles"
            value={payrolls.length}
            delay="delay-200"
          />
        </div>
      )}

      <div className="card overflow-hidden animate-slide-up delay-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">Historial de nóminas</h2>
          <button onClick={downloadSelected} disabled={selectedPayrolls.size === 0} className="btn-primary w-full sm:w-auto">
            <Download size={18} aria-hidden="true" />
            Descargar ({selectedPayrolls.size})
          </button>
        </div>

        {payrolls.length === 0 ? (
          <EmptyState icon={<FileText size={32} />} title="No hay nóminas disponibles" hint="Cuando RRHH publique una nómina, aparecerá aquí." />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left">
                      <button
                        onClick={toggleAll}
                        role="checkbox"
                        aria-checked={allSelected}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        {allSelected ? <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" /> : <Square size={18} />}
                        Seleccionar
                      </button>
                    </th>
                    <th scope="col" className={headerCell}>Período</th>
                    <th scope="col" className={headerCell}>Importe neto</th>
                    <th scope="col" className={headerCell}>Estado</th>
                    <th scope="col" className={headerCell}>Acciones</th>
                    <th scope="col" className={headerCell}>Firmada</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                  {payrolls.map((payroll) => (
                    <tr key={payroll.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <SelectToggle checked={selectedPayrolls.has(payroll.id)} label={`Seleccionar nómina de ${payroll.month} ${payroll.year}`} onToggle={() => togglePayroll(payroll.id)} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"><PayrollPeriod payroll={payroll} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-white">{formatAmount(payroll.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><PayrollStatus status={payroll.status} /></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => openPayroll(payroll)} className="inline-flex items-center gap-2 text-blue-700 dark:text-blue-400 hover:underline font-medium text-sm">
                          <Download size={16} aria-hidden="true" />
                          Descargar
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <SignedAction payroll={payroll} uploading={uploadingId === payroll.id} onUpload={triggerSignedUpload} onOpen={openSigned} variant="link" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {payrolls.map((payroll) => (
                <li key={payroll.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <SelectToggle checked={selectedPayrolls.has(payroll.id)} label={`Seleccionar nómina de ${payroll.month} ${payroll.year}`} onToggle={() => togglePayroll(payroll.id)} />
                      <PayrollPeriod payroll={payroll} />
                    </div>
                    <PayrollStatus status={payroll.status} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pl-8">
                    <div className="text-base font-bold text-slate-900 dark:text-white">{formatAmount(payroll.amount)}</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openPayroll(payroll)} className="btn-secondary gap-1.5">
                        <Download size={14} aria-hidden="true" />
                        PDF
                      </button>
                      <SignedAction payroll={payroll} uploading={uploadingId === payroll.id} onUpload={triggerSignedUpload} onOpen={openSigned} variant="chip" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <input type="file" ref={fileInputRef} accept=".pdf" onChange={handleSignedFileSelected} className="hidden" aria-hidden="true" tabIndex={-1} />
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
